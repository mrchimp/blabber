module.exports = function(grunt) {

    var js_files = [
        'src/js/jquery-1.10.2.min.js',
        'src/js/BlabberClient.js',
        'src/js/chat.js'
    ];

    var jshint_files = [
        'src/js/BlabberClient.js',
        'src/js/chat.js'
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            dist: {
                src: js_files,
                dest: 'www/js/production.js'
            }
        },
        uglify: {
            options: {
                mangle: false,
                compress: false
            },
            dist: {
                files: {
                    'www/js/production.min.js': js_files
                }
            }
        },
        jshint: {
            files: jshint_files
        },
        focus: {
          all: {}
        },
        watch: {
            dist: {
                files: ['src/js/**'],
                tasks: ['concat', 'uglify'],
                options: {
                    nospawn: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-focus');

    grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
};
