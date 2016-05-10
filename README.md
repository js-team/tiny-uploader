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
```


##  TODO


* почитать, как ставить конкретную версию npm пакета - done
* чистить код - done
* куча пробелов - done
* подмодули / static - done
