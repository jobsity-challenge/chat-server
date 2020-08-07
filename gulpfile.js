/**
 * Copyright (C) 2020 IKOA Business Opportunity
 * All Rights Reserved
 * Author: Reinier Millo Sánchez <reinier.millo88@gmail.com>
 *
 * This file is part of the JobSity Challenge.
 * It can't be copied and/or distributed without the express
 * permission of the author.
 */
const gulp = require('gulp');
const pump = require('pump');
const javascriptObfuscator = require('gulp-javascript-obfuscator');
const ts = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");

gulp.task('release', function(cb) {
  pump([
    tsProject.src()
      .pipe(tsProject())
      .js.pipe(gulp.dest("build")),
    gulp.src('build/**/*.js'),
    javascriptObfuscator(),
    gulp.dest('dist-obf')
  ], cb);
});
