use rocket::{
    http::Status,
    serde::json::{json, Value},
};
use snowflake_me::Snowflake;

pub mod auth;
pub mod users;
pub mod validated_json;
pub mod wallets;

pub type Response = Result<ResponseOk, ResponseError>;
pub type ResponseOk = Value;
pub type ResponseError = (Status, Value);

pub fn create_error(status: Status, reason: &str, description: &str) -> ResponseError {
    (
        status,
        json!({
            "error": {
                "code": status.code,
                "reason": reason,
                "description": description,
            }
        }),
    )
}

pub fn generate_id(sf: &Snowflake) -> Result<String, ResponseError> {
    sf.next_id()
        .map_err(|err| {
            create_error(
                Status::InternalServerError,
                "Failed to generate id",
                err.to_string().as_str(),
            )
        })
        .map(|id| id.to_string())
}
