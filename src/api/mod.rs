use rocket::{
    http::Status,
    serde::json::{json, Value},
};
use snowflake_me::Snowflake;

pub mod auth;
pub mod users;

pub type Response = Result<ResponseOk, ResponseError>;
pub type ResponseOk = Value;
pub type ResponseError = (Status, Value);

pub fn create_error(code: u16, reason: &str, description: &str) -> ResponseError {
    (
        Status::new(code),
        json!({
            "error": {
                "code": code,
                "reason": reason,
                "description": description,
            }
        }),
    )
}

pub fn generate_id(sf: &Snowflake) -> Result<String, ResponseError> {
    sf.next_id()
        .map_err(|err| create_error(500, "Failed to generate id", err.to_string().as_str()))
        .map(|id| id.to_string())
}
