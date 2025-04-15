use rocket_db_pools::sqlx::FromRow;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
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
