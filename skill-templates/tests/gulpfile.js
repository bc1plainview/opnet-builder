import gulp from 'gulp';
import ts from 'gulp-typescript';

const tsProject = ts.createProject('tsconfig.json');

gulp.task('build', function () {
    return tsProject.src().pipe(tsProject()).pipe(gulp.dest('build'));
});

gulp.task('default', gulp.series('build'));
