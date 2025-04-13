use std::env;

use rocket::{launch, routes};
use rocket_db_pools::Database;

mod api;
mod db;

use api::{
    users::{create_user, delete_user, get_user, login_user, update_user},
    wallets::{create_wallet, delete_wallet, get_wallets, update_wallet},
};
use db::Db;

#[launch]
fn rocket() -> _ {
    dotenv::dotenv().ok();

    let sf = snowflake_me::Snowflake::new().expect("Failed to create Snowflake instance");
    let key = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    let cors = rocket_cors::CorsOptions::default()
        .allow_credentials(true)
        .to_cors()
        .expect("Failed to create CORS options");

    rocket::build()
        .manage(sf)
        .manage(key)
        .attach(cors)
        .attach(Db::init())
        .mount(
            "/api",
            routes![
                // "/api/users",
                create_user,
                get_user,
                update_user,
                delete_user,
                login_user,
                // "/api/wallets",
                get_wallets,
                create_wallet,
                update_wallet,
                delete_wallet,
            ],
        )
}
