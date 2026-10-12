// Pas de console Windows en production.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    bureau_simplifie_lib::run();
}
