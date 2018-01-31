var gulp = require('gulp');

var clean = require('gulp-clean');
var webserver = require('gulp-webserver');
var sass = require('gulp-sass');
var inject = require('gulp-inject');
var concat = require('gulp-concat');
var htmlmin = require('gulp-htmlmin');
var install = require("gulp-install");
var gulpSequence = require('gulp-sequence');
var ngAnnotate = require('gulp-ng-annotate');
var minifyCss = require('gulp-minify-css');
var mainBowerFiles = require('main-bower-files');
var uglify = require('gulp-uglify');
var rev = require('gulp-rev');
var order = require('gulp-order');

var bases = {
	appSrc: './app/',
	appDist: './dist/'
};

var getPaths = function(src) {
	return {
		scripts: [bases[src] + '**/*.js', '!' + bases[src] + 'bower_components/**', '!' + bases[src] + '**/*.spec.js', '!'],
		scss: [bases[src] + '**/*.scss', '!' + bases[src]+ 'bower_components/**'],
		css: [bases[src] + '**/*.css', '!' + bases[src]+ 'bower_components/**'],
		html: [bases[src] + '**/*.html', '!' + bases[src] + 'bower_components/**'],
		csv: [bases[src] + '**/*.csv', '!' + bases[src] + 'bower_components/**'],
		docs: [bases[src] + 'assets/docs/**/*.*'],
		bower: [bases[src] + 'bower_components/**'],
		specs: [bases[src] + '**/*.spec.js'],
		fonts: [bases[src] + 'assets/fonts/**'],
		allExceptBower: [bases[src] + '**', '!' + bases[src] + 'bower_components/**'],
		images: [bases[src] + '**/images/**'],
		json: [bases[src] + '**/*.json'],
		pg: [bases['src'] + 'pg/**/*.*']
	};
};

//////////// GLOBAL  /////////

gulp.task('default', ['app']);

gulp.task('serve', ['serve-app']);

//////////// APP ////////////

gulp.task('app', gulpSequence(['bower-app'], ['inject-bower-app'], ['minify-app', 'copy-app']));

gulp.task('serve-app', ['app'], function() {
	gulp.src(bases.appDist)
	.pipe(webserver({
		port: 8001,
		livereload: true,
		open: true
	}))

	var watcher = gulp.watch([bases.appSrc + '**/*.js', bases.appSrc + '**/*.html', bases.appSrc + '**/*.scss'], ['minify-app', 'copy-app']);
	watcher.on('change', function(event) {
		console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
	});
});

gulp.task('bower-app', function() {
	return gulp.src([bases.appSrc + '../bower.json'])
	.pipe(install());
});

// Delete the dist directory
gulp.task('clean-app', function() {
	return gulp.src(bases.appDist, {read: false})
	.pipe(clean());
});

gulp.task('copy-app', ['clean-app'], function() {
	// Copy html
	gulp.src(getPaths('appSrc').html, {base: bases.appSrc})
	.pipe(gulp.dest(bases.appDist));

	// Copy bower libraries
	gulp.src(getPaths('appSrc').bower, {base: bases.appSrc})
	.pipe(gulp.dest(bases.appDist));

	// Copy images
	gulp.src(getPaths('appSrc').images, {base: bases.appSrc})
	.pipe(gulp.dest(bases.appDist));

	// Copy fonts
	gulp.src(getPaths('appSrc').fonts, {base: bases.appSrc})
	.pipe(gulp.dest(bases.appDist));

	// Copy json
	gulp.src(getPaths('appSrc').json, {base: bases.appSrc})
	.pipe(gulp.dest(bases.appDist));
});

gulp.task('concat-app:bower', function () {
	return gulp.src(mainBowerFiles({paths: {
        bowerDirectory: bases.appSrc + 'bower_components',
        bowerrc: bases.appSrc + '../.bowerrc',
        bowerJson: bases.appSrc + '../bower.json'
    }}))
    .pipe(concat('app.vendor.js'))
	.pipe(gulp.dest('temp'));
});

gulp.task('concat-app:js', ['clean-app'], function () {
	return gulp.src(getPaths('appSrc').scripts, {base: bases.appSrc})
	
	.pipe(ngAnnotate())
	.pipe(concat('app.js'))
	// .pipe(uglify())
	
	.pipe(rev())
	.pipe(gulp.dest(bases.appDist));
});

gulp.task('sass-app', ['clean-app'], function () {
	return gulp.src(bases.appSrc + '/**/*.scss')
	.pipe(concat('main.scss'))
	.pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
	.pipe(rev())
	.pipe(gulp.dest(bases.appDist + 'assets/css/'));
});

gulp.task('index-app', ['concat-app:js', 'sass-app'], function () {
	return gulp.src(bases.appDist + 'index.html')
	.pipe(inject(gulp.src([bases.appDist + '**', '!' + bases.appDist + 'bower_components/**'], {base: bases.appDist, read: false}), {relative: true}))
	.pipe(gulp.dest(bases.appDist));
});

gulp.task('index-app:src', ['minify-app', 'copy-app'], function () {
	return gulp.src(bases.appSrc + 'index.html')
	.pipe(inject(gulp.src([bases.appDist + '**/*.css', bases.appSrc + '**/*.js', '!' + bases.appDist + 'bower_components/**', '!' + bases.appSrc + 'bower_components/**'], {read: false}), {ignorePath: ["/WebContent/app/", "/src-web/app/src/"]}))
  	.pipe(gulp.dest(bases.appSrc));
  });

gulp.task('inject-bower-app', function () {
	return gulp.src(bases.appSrc + 'index.html')
	.pipe(inject(gulp.src(mainBowerFiles({paths: {
        bowerDirectory: bases.appSrc + 'bower_components',
        bowerrc: bases.appSrc + '../.bowerrc',
        bowerJson: bases.appSrc + '../bower.json'
    }}).concat(['!' + bases.appSrc + 'bower_components/angular/**', '!' + bases.appSrc + 'bower_components/jquery/**']), {read: false}), {name: 'bower', relative: true}))
    .pipe(inject(gulp.src(bases.appSrc + 'bower_components/angular/angular.js', {read: false}), {starttag: '<!-- inject:angular -->', relative: true}))
    .pipe(inject(gulp.src(bases.appSrc + 'bower_components/jquery/dist/jquery.js', {read: false}), {starttag: '<!-- inject:jquery -->', relative: true}))
	.pipe(gulp.dest(bases.appSrc));
});

gulp.task('minify-app', ['index-app'], function() {
	return gulp.src(bases.appDist + '**/*.html')
   	.pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest(bases.appDist))
});



