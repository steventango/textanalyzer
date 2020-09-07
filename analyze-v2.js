/*global ux emojiRegex */
var text_analyzer = {
  analyze() {
    ux.submit.disable(); //disable clicking of submit button
    var input = document.getElementById('textarea').value;
    text_analyzer.data.delimiter = document.getElementById('delimiter').value;
    if (['denied', 'granted'].indexOf(Notification.permission) === -1) {
      Notification.requestPermission();
    }
    if (dropbox.file) {//file input
      var fileReader = new FileReader();
      fileReader.addEventListener('load', (event) => { //when file is read
        var contents = event.target.result;
        var fullPath = dropbox.file.name;
        var fileExtension = fullPath.split('.').pop().toLowerCase();
        if (['txt', 'csv'].indexOf(fileExtension) > -1) {
          text_analyzer.decoder.decode(contents, text_analyzer.data.delimiter);
        } else {
          window.alert('Please upload a *.txt, or *.csv file.');
          ux.submit.enable();
          return;
        }
      });
      fileReader.readAsText(dropbox.file);
    } else if (input.trim().length > 0) {//textarea input
      this.decoder.decode(input, text_analyzer.data.delimiter);
    } else {
      ux.submit.enable();
      alert('Please enter text to begin the analysis.');
    }
  },
  data: {},
  decoder: {
    decode(raw, delimiter) {
      emojiRegex.then(regex => {
        text_analyzer.benchmark = performance.now(); //get current time
        //uses a worker to do heavy processing on another thread, so the main thread does not become blocked and unresponsive
        text_analyzer.decoder.worker = new Worker('decoder.js');
        text_analyzer.decoder.worker.addEventListener('message', this.finish); //when worker replies call method finish
        text_analyzer.decoder.worker.postMessage(JSON.stringify({
          raw: raw,
          delimiter: delimiter,
          regex: regex.source,
        }));
      });
    },
    finish(event) {
      text_analyzer.data = JSON.parse(event.data);
      text_analyzer.benchmark = performance.now() - text_analyzer.benchmark;
      text_analyzer.data.html.overview = text_analyzer.data.html.overview.replace('%%benchmark%%', (text_analyzer.benchmark / 1000).toFixed(2) + ' seconds');
      console.log('Analyze Time (seconds): ' + text_analyzer.benchmark / 1000);
      //notify user, as user can leave the page and let analysis run in the background
      if (Notification.permission === 'granted') {
        var notify = new Notification('Text Analysis Has Completed!', {
          icon: '/wapps/textanalyzer/assets/images/android-chrome-512x512.png'
        });
        setTimeout(notify.close.bind(notify), 4000); //close notification in 4000
        notify.onclick = () => {
          window.focus();
          this.close();
        };
      }
      if (!text_analyzer.data.texts) {//hide menu buttons to sms only categories if the analysis is plaintext
        var style = document.createElement('style');
        style.innerText = '.smsonly{display:none}';
        document.body.appendChild(style);
      }
      ux.navigate('overview');
    }
  },
  export() {
    function download(filename, data) {
      var blob = new Blob([data], {
        type: 'text/plain'
      });
      var element = window.document.createElement('a');
      element.href = window.URL.createObjectURL(blob);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element);
    }

    if (text_analyzer.data.hasOwnProperty('words')) {
      var title = prompt('Export Title: ');
      if (title.length < 1) {
        return;
      }
      var baseURL = '/wapps/textanalyzer/dev/';

      fetch(baseURL + 'index.html')
        .then(v => v.text())
        .then(response => {
          response = response
            .replace(/Text Analyzer/g, title)
            .replace('<link rel="manifest" href="/wapps/textanalyzer/dev/manifest.json">', '')
            .replace('<script defer src="/wapps/textanalyzer/dev/analyze-v2.js"></script>', '')
            .replace('<a class="mdc-list-item" data-mdc-auto-init="MDCRipple" href="#input">', '<a class="mdc-list-item" data-mdc-auto-init="MDCRipple" href="//steventang.tk/wapps/textanalyzer/">')
            .replace('<script defer src="/shared/js/emojiregex.min.js"></script>', '<style>.export-item' + (text_analyzer.data.texts ? '' : ',.smsonly') + '{display:none}</style>');
          download('index.html', response);
        });

      ['overview.html', 'category.html', 'wordcloud.html', 'main-v2.css']
      .map(url => fetch(baseURL + url)
        .then(v => v.text())
        .then(v => download(url, v))
      );

      setTimeout(function() {
        fetch(baseURL + 'main-v2.js')
          .then(v => v.text())
          .then(response => {
            response = response
            .replace(/(redirectTo: '\/input'|redirectTo:"\/input")/, "redirectTo:'/overview'");
            response += 'var text_analyzer = {data:' + JSON.stringify(text_analyzer.data).replace(/(\\n|\\t)/gm, '') + '};';
            download('main-v2.js', response);
          });
      }, 500); //download the javascript file last as it will trigger a download warning prompt for the user
    } else {
      window.alert('Please create a text analysis first.');
    }
  }
};

//handles drag and drop files
var dropbox = {
  filechange(files) {
    var label;
    this.element = document.getElementById("dropbox");
    this.element.classList.add('containsFile');
    this.icon = document.getElementById("dropbox_icon");
    this.icon.innerText = 'insert_drive_file';
    if (files) {
      label = files[0].name.replace(/\\/g, '/').replace(/.*\//, '');
      dropbox.file = files[0];
    } else {
      let fileIn = document.getElementById('filein');
      label = fileIn.value.replace(/\\/g, '/').replace(/.*\//, '');
      dropbox.file = fileIn.files[0];
    }
    document.getElementById('filedisplay').innerText = label;
  },
  init() {
    this.element = document.getElementById("dropbox");
    this.icon = document.getElementById("dropbox_icon");
    this.element.addEventListener("dragenter", event => {
      this.icon.innerText = 'file_upload';
      this.element.classList.remove('containsFile');
      dropbox.element.MDCRipple.activate();
      event.stopPropagation();
      event.preventDefault();
    }, false);
    this.element.addEventListener("dragover", event => {
      event.stopPropagation();
      event.preventDefault();
    }, false);
    this.element.addEventListener("dragleave", event => {
      if (dropbox.file) {
        this.icon.innerText = 'insert_drive_file';
        this.element.classList.add('containsFile');
      } else {
        this.icon.innerText = 'file_upload';
      }
      dropbox.element.MDCRipple.deactivate();
      event.stopPropagation();
      event.preventDefault();
    }, false);
    this.element.addEventListener("drop", event => {
      dropbox.element.MDCRipple.deactivate();
      event.stopPropagation();
      event.preventDefault();
      dropbox.filechange(event.dataTransfer.files);
    }, false);
  }
};

//this part of ux is analysis only and should not be included in exports
ux.submit = {
  enable() {
    var btn = document.getElementById('submit');
    btn.innerHTML = 'Analyze';
    btn.parentElement.style.pointerEvents = 'all';
  },
  disable() {
    var btn = document.getElementById('submit');
     //displays a nice loader to let user know that it's analyzing
    btn.innerHTML = '<div class="loader">Analyzing...</div>';
    btn.parentElement.style.pointerEvents = 'none';
  }
};
