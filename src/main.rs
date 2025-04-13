use std::env;

use rocket::{launch, routes};
use rocket_db_pools::Database;

mod api;
mod db;

use api::users::{create_user, delete_user, get_user, login_user, update_user};
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
            routes![create_user, get_user, update_user, delete_user, login_user],
        )
}
