var mongoose =    require('mongoose');
var colors =      require('colors');

module.exports = function (dbURI) {
    mongoose.connect(dbURI);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error...'.red));
    db.once('open', function callback() {
        console.log('MongoDB Connected'.green);
    });

};
