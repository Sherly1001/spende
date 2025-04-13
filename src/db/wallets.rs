use rocket_db_pools::sqlx::{sqlite::SqliteRow, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Wallet {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub currency: String,
    pub rational: f64,
    pub balance: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewWallet {
    pub name: String,
    pub currency: String,
    pub rational: Option<f64>,
}

impl From<SqliteRow> for Wallet {
    fn from(val: SqliteRow) -> Self {
        Wallet {
            id: val.get("id"),
            user_id: val.get("user_id"),
            name: val.get("name"),
            currency: val.get("currency"),
            rational: val.get("rational"),
            balance: val.get("balance"),
        }
    }
}
