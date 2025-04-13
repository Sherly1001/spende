use rocket_db_pools::sqlx::{sqlite::SqliteRow, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
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

impl From<SqliteRow> for User {
    fn from(val: SqliteRow) -> Self {
        User {
            id: val.get("id"),
            name: val.get("name"),
            username: val.get("username"),
            hashed_password: val.get("hashed_password"),
        }
    }
}
