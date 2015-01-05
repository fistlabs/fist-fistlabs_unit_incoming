/*eslint max-nested-callbacks: 0*/
/*global describe, it*/
'use strict';

var Server = require('fist/core/server');

var assert = require('assert');
var supertest = require('supertest');
var fs = require('fs');
var path = require('path');

function getApp(params) {
    var app = new Server(params);
    app.logger.conf({
        logLevel: 'INTERNAL'
    });

    app.install(require.resolve('../fistlabs_unit_incoming'));
    app.alias('fistlabs_unit_incoming', 'body');
    return app;
}

describe('fistlabs_unit_incoming', function () {

    it('Should parse raw body', function (done) {
        var back = getApp({});

        back.route('POST /upload/', {
            name: 'upload',
            unit: 'test'
        });

        back.unit({
            name: 'test',
            deps: ['body'],
            main: function (track, context) {
                var body = context.r('body');
                assert.strictEqual(body.type, 'raw');
                assert.deepEqual(body.input, new Buffer('foo'));

                track.send('bar');
            }
        });

        var req = supertest(back.getHandler()).post('/upload/');

        req.
            set('Content-Type', 'application/octet-stream').
            send('foo').
            expect(200).
            expect('bar').
            end(done);
    });

    it('Should parse json body', function (done) {
        var back = getApp();

        back.route('POST /upload/', {
            name: 'upload',
            unit: 'test'
        });

        back.unit({
            name: 'test',
            deps: ['body'],
            main: function (track, context) {
                var body = context.r('body');
                assert.strictEqual(body.type, 'json');
                assert.deepEqual(body.input, {foo: 'bar'});

                track.send('bar');
            }
        });

        var req = supertest(back.getHandler()).post('/upload/');

        req.
            set('Content-Type', 'application/json').
            send('{"foo": "bar"}').
            expect(200).
            expect('bar').
            end(done);
    });

    it('Should parse text body', function (done) {
        var back = getApp();

        back.route('POST /upload/', {
            name: 'upload',
            unit: 'test'
        });

        back.unit({
            name: 'test',
            deps: ['body'],
            main: function (track, context) {
                var body = context.r('body');
                assert.strictEqual(body.type, 'text');
                assert.deepEqual(body.input, 'foo');

                track.send('bar');
            }
        });

        var req = supertest(back.getHandler()).post('/upload/');

        req.
            set('Content-Type', 'text/plain').
            send('foo').
            expect(200).
            expect('bar').
            end(done);
    });

    it('Should be failed on body parsing', function (done) {
        var spy = 0;
        var back = getApp();

        back.route('POST /upload/', {
            name: 'upload',
            unit: 'test'
        });

        back.unit({
            name: 'test',
            deps: ['body'],
            main: function (track) {
                spy = 42;
                track.send('bar');
            }
        });

        var req = supertest(back.getHandler()).post('/upload/');

        req.
            set('Content-Type', 'application/octet-stream; charset=asdasd').
            send('foo').
            expect(415).
            end(function (err) {
                assert.strictEqual(spy, 0);
                done(err);
            });
    });

    it('Should parse urlencoded body', function (done) {
        var back = getApp();

        back.route('POST /upload/', {
            name: 'upload',
            unit: 'test'
        });

        back.unit({
            name: 'test',
            deps: ['body'],
            main: function (track, context) {
                var body = context.r('body');
                assert.strictEqual(body.type, 'urlencoded');
                assert.deepEqual(body.input, {foo: ['bar', '1', '2'], bar: 'baz'});
                track.send('bar');
            }
        });

        var req = supertest(back.getHandler()).post('/upload/');

        req.
            send('foo=bar&bar=baz&foo=1&foo=2').
            set('Content-Type', 'application/x-www-form-urlencoded').
            expect(200).
            expect('bar').
            end(done);
    });

    it('Should parse multipart body', function (done) {
        var back = getApp();

        back.route('POST /upload/', {
            name: 'upload',
            unit: 'test'
        });

        back.unit({
            name: 'test',
            deps: ['body'],
            main: function (track, context) {
                var body = context.r('body');
                assert.strictEqual(body.type, 'multipart');
                assert.deepEqual(body.input, {foo: ['1', '2', '3']});
                assert.ok(Array.isArray(body.files.file));
                assert.deepEqual(body.files.file[0].contents, fs.readFileSync(__filename));
                assert.strictEqual(body.files.file[1].filename, path.basename(__filename));
                assert.strictEqual(body.files.file[2].mimeType, 'application/javascript');

                track.send('bar');
            }
        });

        var req = supertest(back.getHandler()).post('/upload/');

        req.
            set('Content-Type', 'multipart/form-data');

        req.field('foo', '1');
        req.field('foo', '2');
        req.field('foo', '3');

        req.attach('file', __filename);
        req.attach('file', __filename);
        req.attach('file', __filename);

        req.
            expect(200).
            expect('bar').
            end(done);

    });

    it('Should be failed coz no boundary passed', function (done) {
        var back = getApp();

        back.route('POST /upload/', {
            name: 'upload',
            unit: 'test'
        });

        back.unit({
            name: 'test',
            deps: ['body'],
            main: function (track) {
                track.send('bar');
            }
        });

        supertest(back.getHandler()).post('/upload/').
            set('Content-Type', 'multipart/form-data').
            expect(400).
            end(done);
    });

    it('Should be failed while parsing multipart', function (done) {
        var back = getApp();

        back.route('POST /upload/', {
            name: 'upload',
            unit: 'test'
        });

        back.unit({
            name: 'test',
            deps: ['body'],
            main: function (track) {
                track.send('bar');
            }
        });

        var req = supertest(back.getHandler()).post('/upload/');
        var parts = [
            '--asdasdasdasd\r\n',
            'Content-Type: text/plain\r\n',
            'Content-Disposition: form-data; name="foo"\r\n',
            '\r\n',
            'asd\r\n',
            '--asdasdasdasd--'
        ];

        req.
            set('Content-Type', 'multipart/form-data; boundary=asdasdasdasd').
            send(parts.join(':)'));

        req.
            expect(400).
            end(done);
    });

    it('Should send 400 for bad media type', function (done) {
        var back = getApp();

        back.route('POST /upload/', {
            name: 'upload',
            unit: 'test'
        });

        back.unit({
            name: 'test',
            deps: ['body'],
            main: function (track) {
                track.send('bar');
            }
        });

        var req = supertest(back.getHandler()).post('/upload/');

        req.
            set('Content-Type', '|||||').
            send('foo').
            expect(400).
            end(done);
    });

});
