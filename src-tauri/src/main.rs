// Pas de fenêtre console en plus sous Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    thrall_lib::run()
}
