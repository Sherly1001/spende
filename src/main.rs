use rocket::{
    launch, post, routes,
    serde::json::{Json, Value},
};

#[post("/echo", data = "<data>")]
async fn echo(data: Json<Value>) -> Value {
    data.into_inner()
}

#[launch]
fn rocket() -> _ {
    rocket::build().mount("/api", routes![echo])
}
