use rocket::{
    data::{FromData, Outcome},
    serde::json::Json,
    Data, Request,
};
use serde::Deserialize;

use super::{create_error, ResponseError};

pub struct ValidatedJsonResult<T>(pub Result<Json<T>, ResponseError>);

#[rocket::async_trait]
impl<'r, T: Deserialize<'r> + 'static> FromData<'r> for ValidatedJsonResult<T> {
    type Error = ResponseError;

    async fn from_data(request: &'r Request<'_>, data: Data<'r>) -> Outcome<'r, Self, Self::Error> {
        let body = Json::<T>::from_data(request, data).await;
        match body {
            Outcome::Forward(data) => Outcome::Forward(data),
            Outcome::Success(json) => Outcome::Success(ValidatedJsonResult(Ok(json))),
            Outcome::Error(err) => Outcome::Success(ValidatedJsonResult(Err(create_error(
                err.0,
                "Invalid Body",
                err.1.to_string().as_str(),
            )))),
        }
    }
}
