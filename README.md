# image uploader

### Install...

```cli
	npm i
```

### About...

```cli
jQuery('.image-uploader-form').each(function() {
    new ImageUploader({
        form: this,
        validateTypes: 'image.*',
        onRemoveThumb (thumb) {
            console.log(thumb)
        },
        onSuccess () {
            console.log('success')
        }
    });
});

jQuery('.file-uploader-form').each(function() {
    new ImageUploader({
        form: this,
        validateFormats: 'css|js'
    });
});
```


##  TODO


* почитать, как ставить конкретную версию npm пакета
* чистить код
* куча пробелов
* подмодули / static
* 