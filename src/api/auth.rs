use std::collections::BTreeMap;

use hmac::{digest::KeyInit, Hmac};
use jwt::VerifyWithKey;
use rocket::{
    http::Status,
    request::{FromRequest, Outcome},
    Request,
};
use rocket_db_pools::sqlx;
use serde::{Deserialize, Serialize};
use sha2::Sha256;

use crate::db::{users::User, DbConn};

use super::{create_error, ResponseError};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthUser(pub User);

pub type AuthUserResult = Result<AuthUser, ResponseError>;

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthUser {
    type Error = ResponseError;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let cookies = request.cookies();
        let key = request.rocket().state::<String>().unwrap();
        let mut db = request.guard::<DbConn>().await.unwrap();

        let no_token_error =
            create_error(Status::Unauthorized, "Unauthorized", "No token provided");

        let invalid_token_error =
            create_error(Status::Unauthorized, "Unauthorized", "Invalid token");

        let token = match cookies.get("token") {
            Some(token) => token,
            None => {
                return Outcome::Error((no_token_error.0, no_token_error));
            }
        };

        let token = token.value();

        let key: Hmac<Sha256> = Hmac::new_from_slice(key.as_bytes()).unwrap();
        let claims: BTreeMap<String, String> = match token.verify_with_key(&key) {
            Ok(claims) => claims,
            Err(_) => {
                return Outcome::Error((invalid_token_error.0, invalid_token_error));
            }
        };

        let user_id = match claims.get("sub") {
            Some(user_id) => user_id,
            None => {
                return Outcome::Error((invalid_token_error.0, invalid_token_error));
            }
        };

        let db_user: User = match sqlx::query("SELECT * FROM users WHERE id = ?")
            .bind(user_id)
            .fetch_one(&mut **db)
            .await
        {
            Ok(user) => user.into(),
            Err(_) => return Outcome::Error((invalid_token_error.0, invalid_token_error)),
        };

        Outcome::Success(AuthUser(db_user))
    }
}
