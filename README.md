fist-fistlabs_unit_incoming [![Build Status](https://travis-ci.org/fistlabs/fist-fistlabs_unit_incoming.svg)](https://travis-ci.org/fistlabs/fist-fistlabs_unit_incoming)
========================

Fist plugin providing body parser unit.

Usage:

```js
app.install('fist-fistlabs_unit_incoming');
app.alias('fist-fistlabs_unit_incoming', 'body');

app.unit({
    name: 'demo-parser',
    deps: ['body'],
    main: function (track, context) {
        var body = context.r('body');
        
        body.type // String<multipart,urlencoded,json,text,raw>
        body.input //   parsed body
        body.files // files array in case of multipart
    }
});

```

---------
LICENSE [MIT](LICENSE)
