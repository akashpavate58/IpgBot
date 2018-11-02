module.exports = function(grunt){
  grunt.initConfig({
    watch: {
      css: {
        files: ['public/less/*.less'],
        tasks: ['less']
      },
    },

    less: {
      development: {
        options: {
          paths: ['public/less']
        },
        files: {
          'public/css/styles.css': 'public/less/styles.less'
        }
      }
    },

    nodemon: {
      dev: {
        script: 'server.js'
      }
    },

    concurrent: {
      options: {
        logConcurrentOutput: true
      },
      tasks: ['nodemon', 'watch']
    }

  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-concurrent');

  grunt.registerTask('default', ['concurrent']);
}
