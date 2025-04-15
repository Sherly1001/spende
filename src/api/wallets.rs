use rocket::{delete, get, http::Status, post, put, serde::json::json, State};
use rocket_db_pools::sqlx;
use snowflake_me::Snowflake;

use crate::db::{
    wallets::{NewWallet, Wallet},
    DbConn,
};

use super::{
    auth::AuthUserResult, create_error, generate_id, validated_json::ValidatedJsonResult, Response,
};

#[get("/wallets")]
pub async fn get_wallets(user: AuthUserResult, mut db: DbConn) -> Response {
    let user = user?.0;

    let wallets: Vec<Wallet> = sqlx::query_as("SELECT * FROM wallets WHERE user_id = ?")
        .bind(&user.id)
        .fetch_all(&mut **db)
        .await
        .map_err(|err| {
            create_error(
                Status::InternalServerError,
                "Failed to get wallets",
                err.to_string().as_str(),
            )
        })?;

    Ok(json!({
        "data": wallets,
    }))
}

#[post("/wallets", data = "<wallet>")]
pub async fn create_wallet(
    user: AuthUserResult,
    wallet: ValidatedJsonResult<NewWallet>,
    sf: &State<Snowflake>,
    mut db: DbConn,
) -> Response {
    let user = user?.0;
    let mut wallet = wallet.0?.0;

    if wallet.rational.is_none() {
        wallet.rational = Some(1.0);
    }

    let id = generate_id(sf)?;

    let wallet: Wallet = sqlx::query_as(
        "INSERT INTO wallets (id, user_id, name, currency, rational, balance)
        VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
    )
    .bind(&id)
    .bind(&user.id)
    .bind(&wallet.name)
    .bind(&wallet.currency)
    .bind(&wallet.rational)
    .bind(0)
    .fetch_one(&mut **db)
    .await
    .map_err(|err| {
        create_error(
            Status::UnprocessableEntity,
            "Failed to create wallet",
            err.to_string().as_str(),
        )
    })?;

    Ok(json!({
        "data": wallet,
    }))
}

#[put("/wallets/<id>", data = "<wallet>")]
pub async fn update_wallet(
    user: AuthUserResult,
    id: &str,
    wallet: ValidatedJsonResult<NewWallet>,
    mut db: DbConn,
) -> Response {
    let user = user?.0;
    let mut wallet = wallet.0?.0;

    let db_wallet: Wallet = sqlx::query_as("SELECT * FROM wallets WHERE id = ? AND user_id = ?")
        .bind(&id)
        .bind(&user.id)
        .fetch_one(&mut **db)
        .await
        .map_err(|err| {
            create_error(
                Status::NotFound,
                "Wallet not found",
                err.to_string().as_str(),
            )
        })?;

    if wallet.rational.is_none() {
        wallet.rational = Some(db_wallet.rational);
    }

    let wallet: Wallet = sqlx::query_as(
        "UPDATE wallets SET name = ?, currency = ?, rational = ?
        WHERE id = ? AND user_id = ?
        RETURNING *",
    )
    .bind(&wallet.name)
    .bind(&wallet.currency)
    .bind(&wallet.rational)
    .bind(&id)
    .bind(&user.id)
    .fetch_one(&mut **db)
    .await
    .map_err(|err| {
        create_error(
            Status::UnprocessableEntity,
            "Failed to update wallet",
            err.to_string().as_str(),
        )
    })?;

    Ok(json!({
        "data": wallet,
    }))
}

#[delete("/wallets/<id>")]
pub async fn delete_wallet(user: AuthUserResult, id: &str, mut db: DbConn) -> Response {
    let user = user?.0;

    let db_wallet: Wallet = sqlx::query_as("SELECT * FROM wallets WHERE id = ? AND user_id = ?")
        .bind(&id)
        .bind(&user.id)
        .fetch_one(&mut **db)
        .await
        .map_err(|err| {
            create_error(
                Status::NotFound,
                "Wallet not found",
                err.to_string().as_str(),
            )
        })?;

    sqlx::query("DELETE FROM wallets WHERE id = ? AND user_id = ?")
        .bind(&id)
        .bind(&user.id)
        .execute(&mut **db)
        .await
        .map_err(|err| {
            create_error(
                Status::UnprocessableEntity,
                "Failed to delete wallet",
                err.to_string().as_str(),
            )
        })?;

    Ok(json!({
        "data": db_wallet,
    }))
}
