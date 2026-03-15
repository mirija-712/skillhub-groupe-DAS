<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes Web (front Laravel / Blade) - SkillHub utilise surtout l'API
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return view('welcome');
});
