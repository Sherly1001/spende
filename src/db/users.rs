use rocket_db_pools::sqlx::FromRow;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct User {
    pub id: String,
    pub name: String,
    pub username: String,
    pub hashed_password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewUser {
    pub name: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateUser {
    pub name: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub old_password: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoginUser {
    pub username: String,
    pub password: String,
}
