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

    let sf = snowflake_me::Snowflake::new().unwrap();
    let key = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    rocket::build()
        .manage(sf)
        .manage(key)
        .attach(Db::init())
        .mount(
            "/api",
            routes![create_user, get_user, update_user, delete_user, login_user],
        )
}
