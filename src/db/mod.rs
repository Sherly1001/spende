use rocket_db_pools::{sqlx, Connection, Database};

#[derive(Database)]
#[database("spende")]
pub struct Db(sqlx::SqlitePool);

pub type DbConn = Connection<Db>;

pub mod users;
