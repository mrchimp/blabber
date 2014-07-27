module.exports = function(grunt) {

    var js_files = [
        'bower_components/jquery/dist/jquery.js',
        'bower_components/bootstrap/dist/js/bootstrap.js',
        'src/js/BlabberClient.js',
        'bower_components/annyang/annyang.js',
        'src/js/main.js'
    ];

    var jshint_files = [
        'src/js/BlabberClient.js',
        'src/js/main.js',
        'modules/Blabber.js',
        'modules/BlabberRoom.js',
        'modules/BlabberUser.js'
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            dist: {
                src: js_files,
                dest: 'www/js/script.js'
            }
        },
        uglify: {
            options: {
                mangle: false,
                compress: false
            },
            dist: {
                files: {
                    'www/js/script.min.js': js_files
                }
            }
        },
        jshint: {
            files: jshint_files
        },
        focus: {
          all: {}
        },
        less: {
            dist: {
                files: {
                    'www/css/style.css': 'src/less/main.less'
                }
            }
        },
        copy: {
            fonts: {
                files: [
                    {
                        expand: true,
                        cwd: 'bower_components/fontawesome/fonts/',
                        src: '*',
                        dest: 'www/fonts/',
                        flatten: true,
                        filter: 'isFile'
                    },
                    {
                        expand: true,
                        cwd: 'bower_components/bootstrap/fonts/',
                        src: '*',
                        dest: 'www/fonts/',
                        flatten: true,
                        filter: 'isFile'
                    },
                ]
            }
        },
        watch: {
            js: {
                files: ['src/js/main.js', 'src/js/BlabberClient.js'],
                tasks: ['jshint', 'concat', 'uglify'],
                options: {
                    nospawn: true
                }
            },
            less: {
                files: ['src/less/*.less'],
                tasks: ['less'],
                options: {
                    nospawn: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-focus');

    grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'less']);
    grunt.registerTask('watch-all', ['focus']);
};
