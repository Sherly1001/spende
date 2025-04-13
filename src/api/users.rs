use std::collections::BTreeMap;

use hmac::{digest::KeyInit, Hmac};
use jwt::SignWithKey;
use rocket::{
    delete, get,
    http::{Cookie, CookieJar, Status},
    post, put,
    serde::json::{json, Json},
    time::Duration,
    State,
};
use rocket_db_pools::sqlx;
use sha2::Sha256;
use snowflake_me::Snowflake;

use crate::db::{
    users::{LoginUser, NewUser, UpdateUser, User},
    DbConn,
};

use super::{auth::AuthUser, create_error, generate_id, Response};

#[get("/users")]
pub async fn get_user(user: AuthUser) -> Response {
    let user = user.0;

    Ok(json!({
        "data": {
            "id": user.id,
            "name": user.name,
            "username": user.username,
        },
    }))
}

#[post("/users", data = "<user>")]
pub async fn create_user(
    user: Json<NewUser>,
    sf: &State<Snowflake>,
    cookies: &CookieJar<'_>,
    mut db: DbConn,
    key: &State<String>,
) -> Response {
    let id = generate_id(sf)?;

    let hashed_password = bcrypt::hash(&user.password, bcrypt::DEFAULT_COST).map_err(|err| {
        create_error(
            Status::InternalServerError,
            "Failed to hash password",
            err.to_string().as_str(),
        )
    })?;

    sqlx::query("INSERT INTO users (id, name, username, hashed_password) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(&user.name)
        .bind(&user.username)
        .bind(&hashed_password)
        .execute(&mut **db)
        .await
        .map_err(|err| {
            create_error(
                Status::UnprocessableEntity,
                "Failed to create user",
                err.to_string().as_str(),
            )
        })?;

    create_token(cookies, key, id.clone());

    Ok(json!({
        "data": {
            "id": id,
            "name": user.name,
            "username": user.username,
        },
    }))
}

#[put("/users", data = "<user>")]
pub async fn update_user(user: Json<UpdateUser>, auth_user: AuthUser, mut db: DbConn) -> Response {
    let db_user = auth_user.0;

    let mut updated_user = db_user.clone();

    if let Some(name) = &user.name {
        updated_user.name = name.clone();
    }

    if let Some(username) = &user.username {
        updated_user.username = username.clone();
    }

    if let Some(password) = &user.password {
        if let Some(old_password) = &user.old_password {
            if !bcrypt::verify(old_password, &db_user.hashed_password).unwrap() {
                return Err(create_error(
                    Status::Unauthorized,
                    "Invalid credentials",
                    "Invalid old password",
                ));
            }
        } else {
            return Err(create_error(
                Status::BadRequest,
                "Invalid request",
                "Old password is required",
            ));
        }

        updated_user.hashed_password =
            bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|err| {
                create_error(
                    Status::InternalServerError,
                    "Failed to hash password",
                    err.to_string().as_str(),
                )
            })?;
    }

    sqlx::query("UPDATE users SET name = ?, username = ?, hashed_password = ? WHERE id = ?")
        .bind(&updated_user.name)
        .bind(&updated_user.username)
        .bind(&updated_user.hashed_password)
        .bind(&db_user.id)
        .execute(&mut **db)
        .await
        .map_err(|err| {
            create_error(
                Status::UnprocessableEntity,
                "Failed to update user",
                err.to_string().as_str(),
            )
        })?;

    Ok(json!({
        "data": {
            "id": db_user.id,
            "name": updated_user.name,
            "username": updated_user.username,
        },
    }))
}

#[delete("/users")]
pub async fn delete_user(auth_user: AuthUser, cookies: &CookieJar<'_>, mut db: DbConn) -> Response {
    let db_user = auth_user.0;

    sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(&db_user.id)
        .execute(&mut **db)
        .await
        .map_err(|err| {
            create_error(
                Status::UnprocessableEntity,
                "Failed to delete user",
                err.to_string().as_str(),
            )
        })?;

    clear_token(cookies);

    Ok(json!({
        "data": {
            "id": db_user.id,
            "name": db_user.name,
            "username": db_user.username,
        },
    }))
}

#[post("/users/login", data = "<user>")]
pub async fn login_user(
    user: Json<LoginUser>,
    cookies: &CookieJar<'_>,
    mut db: DbConn,
    key: &State<String>,
) -> Response {
    clear_token(cookies);
    let unauthenticated = create_error(
        Status::Unauthorized,
        "Invalid credentials",
        "Invalid username or password",
    );

    let db_user: User = sqlx::query("SELECT * FROM users WHERE username = ?")
        .bind(&user.username)
        .fetch_one(&mut **db)
        .await
        .map_err(|_| unauthenticated.clone())?
        .into();

    if !bcrypt::verify(&user.password, &db_user.hashed_password).unwrap() {
        return Err(unauthenticated);
    }

    create_token(cookies, key, db_user.id.clone());

    Ok(json!({
        "data": {
            "id": db_user.id,
            "name": db_user.name,
            "username": db_user.username,
        },
    }))
}

fn clear_token(cookies: &CookieJar<'_>) {
    cookies.remove(Cookie::from("token"));
}

fn create_token(cookies: &CookieJar<'_>, key: &String, user_id: String) {
    let mut claims = BTreeMap::new();
    claims.insert("sub", user_id);

    let key: Hmac<Sha256> = Hmac::new_from_slice(key.as_bytes()).unwrap();
    let token_str = claims.sign_with_key(&key).unwrap();

    cookies.add(
        Cookie::build(("token", token_str))
            .http_only(true)
            .secure(true)
            .same_site(rocket::http::SameSite::None)
            .max_age(Duration::days(7)),
    );
}
