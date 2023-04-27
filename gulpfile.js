/**
 * Created by Miguel Pazo (http://miguelpazo.com)
 */

process.env.DISABLE_NOTIFIER = true;

const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const replace = require('gulp-replace');


gulp.task('default', function () {
    return gulp.src([
        'app/constants.js',
        'app/auth.js'
    ])
        .pipe(concat('idgobpe.js'))
        .pipe(replace('process.env.SERVICE_URL', process.env.SERVICE_URL))
        .pipe(replace('process.env.AUTH_URL', process.env.AUTH_URL))
        .pipe(replace('process.env.TOKEN_URL', process.env.TOKEN_URL))
        .pipe(replace('process.env.USERINFO_URL', process.env.USERINFO_URL))
        .pipe(replace('process.env.LOGOUT_URL', process.env.LOGOUT_URL))
        .pipe(replace('process.env.IDP_URIS', process.env.IDP_URIS))
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
});
