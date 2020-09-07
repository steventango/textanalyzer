/*globals spliddit nlp franc iso6393_min*/
self.importScripts('https://unpkg.com/compromise@latest/builds/compromise.min.js');
self.importScripts('/shared/js/franc-min-v3.0.1.min.js');
self.importScripts('/shared/data/iso-6393-min.min.js');
self.importScripts('/shared/js/spliddit.min.js');
var emojiRegex;
var icons = {
  all: 'all_inclusive',
  hashtags: ['#'],
  ats: ['@'],
  emojis: 'insert_emoticon',
  people: 'people',
  locations: 'location_on',
  time: 'access_time',
  urls: 'link',
  emails: 'email',
  phonenumbers: 'phone',
  languages: 'translate',
  numbers: 'looks_one',
  toptexters: 'star',
  reactions: 'bubble_chart'
};
var text_analyzer = {
  data: {
    categories: {
      hashtags: [],
      ats: [],
      emojis: [],
      languages: [],
      numbers: [],
      locations: [],
      time: [],
      people: [],
      urls: [],
      emails: [],
      phonenumbers: []
    },
    characters: {},
    html: {},
    text: [],
    titles: {
      all: "All",
      hashtags: "Hashtags",
      ats: "Ats",
      emojis: "Emojis",
      languages: "Languages",
      numbers: "Numbers",
      locations: "Locations",
      time: "Time",
      people: "People",
      urls: "URLs",
      emails: "Emails",
      phonenumbers: "Phone Numbers",
      reactions: "Reactions",
      toptexters: "Top Texters"
    },
    totals: {},
    words: {
      raw: []
    }
  },
  categorize(ngram) { //categorize ngrams based on regexes
    var word = ngram[0];
    if (/^\(*\+*[1-9]{0,3}\)*-*[1-9]{0,3}[-. /]*\(*[2-9]\d{2}\)*[-. /]*\d{3}[-. /]*\d{4} *e*x*t*\.* *\d{0,4}$/.test(word)) {
      text_analyzer.data.categories.phonenumbers.push(ngram);
    } else if (/^#/.test(word) && isNaN(word.substring(1, word.length))) {
      text_analyzer.data.categories.hashtags.push(ngram);
    } else if (/^@[^@]*/.test(word) && word.length > 1) {
      text_analyzer.data.categories.ats.push(ngram);
    } else if (emojiRegex.test(word) && !/[\d*#]/.test(word)) {
      text_analyzer.data.categories.emojis.push(ngram);
    } else if (/^(([a-z]+:\/\/)?(([a-z0-9-]+\.)+([a-z]{2}|aero|arpa|asia|biz|com|club|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|top|xyz|travel|local|internal))(:[0-9]{1,5})?(\/[a-zA-Z0-9_.~-]+)*(\/([a-z0-9_.#&+'()$!*'-]*)(\?[a-z0-9+_.%=&amp;-]*)?)?(#[a-zA-Z0-9!$&'()*+.=-_~:/?]*)?)(\s+|$)/.test(word)) {
      text_analyzer.data.categories.urls.push(ngram);
    } else if (/^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/.test(word)) {
      text_analyzer.data.categories.emails.push(ngram);
    } else if (/^[-$]?\d+(,\d+)*(\s\d+)*(\.\d+(e\d+)?)?$/.test(word)) {
      text_analyzer.data.categories.numbers.push(ngram);
    } else {
      if (/[A-Za-z0-9,./]+/.test(word)) { //nlp only supports English, and is computationally expensive, so to improve performance we filter for english words only
        var tags = nlp(word, text_analyzer.lexicon).terms().data()[0].terms[0];
        if (typeof tags !== 'undefined') {
          tags = tags.tags;
          if (tags.indexOf('Place') > -1) {
            text_analyzer.data.categories.locations.push(ngram);
          } else if (tags.indexOf('Date') > -1) {
            text_analyzer.data.categories.time.push(ngram);
          } else if (tags.indexOf('Person') > -1) {
            text_analyzer.data.categories.people.push(ngram);
          }
        }
      }
      text_analyzer.data.categories.languages.push(franc(word, {
        minLength: 1
      }));
    }
  },
  decode: {
    BASE(raw) {
      text_analyzer.data.words.ngrams = text_analyzer.utilities.ngramify(text_analyzer.data.words.raw.filter(Boolean));
      text_analyzer.data.text = raw || text_analyzer.data.text.join(' '); //raw text string

      //essential to categorize ngrams and not words for performance
      var i;
      for (i = 0; i < text_analyzer.data.words.ngrams.length; i++) {
        text_analyzer.categorize(text_analyzer.data.words.ngrams[i]);
      }

      //convert words of category language to language ngrams
      text_analyzer.data.categories.languages = text_analyzer.utilities.ngramify(text_analyzer.data.categories.languages);
      for (i = 0; i < text_analyzer.data.categories.languages.length; i++) {
        text_analyzer.data.categories.languages[i][0] = iso6393_min[text_analyzer.data.categories.languages[i][0]]; //map iso code to language name
        text_analyzer.data.categories.languages[i][1] = Math.round(text_analyzer.data.categories.languages[i][1]);
      }

      //spliddit accounts for unicode surrogate pairs, which javascript incorrectly treats as 2 characters
      text_analyzer.data.characters.raw = spliddit(text_analyzer.data.text).length;
      text_analyzer.data.characters.nospaces = spliddit(text_analyzer.data.text.replace(/\s/g, '')).length;
      var sentences = text_analyzer.data.text.match(/\w[.?!。？！](\s|$)/g); //regex that matches a sentence
      text_analyzer.data.sentences = sentences ? sentences.length : 0;

      //generate HTML
      text_analyzer.generate.totals();
      text_analyzer.generate.categories();
      text_analyzer.generate.overview();

      //reduces memory consumption by marking these objects for garbage collection, also reduces export size.
      delete text_analyzer.data.words.raw;
      delete text_analyzer.data.text;
      delete text_analyzer.data.characters;
      delete text_analyzer.data.sentences;
    },
    PT(data) {
      var words = text_analyzer.utilities.splitWords(data);
      for (var i = 0; i < words.length; i++) {
        text_analyzer.data.words.raw.push(text_analyzer.utilities.stripPunctuation(words[i]));
      }
      text_analyzer.decode.BASE(data);
    },
    SMS(data, delimiter) {
      text_analyzer.data.texts = {
        capita: [],
        daily: {},
        reactions: {
          reactions: []
        },
        streaks: {},
        texters: {}
      };
      //split data by newlines
      data = data.split(/\r?\n/);
      //delete header
      data.shift();
      var i;
      for (i = 0; i < data.length; i++) {
        data[i] = data[i].split(delimiter);
        //remove empty rows
        if (typeof data[i] === 'string' || (data[i].length === 1 && data[i][0] === "")) {
          data[i].splice(i, 1);
          continue;
        }
        //while row has less than 5 columns add next row
        while (data[i].length < 5) {
          data[i] = data[i].concat(data[i + 1].split(delimiter));
          data.splice(i + 1, 1);
        }
        //delete country code
        if (data[i][3].length < 3) {
          data[i] = data[i].slice(0, 3).concat(data[i].slice(4, data[i].length));
        }
        //delete preceding quote from text
        if (typeof data[i][3] !== "undefined") {
          data[i][3] = data[i][3].replace(/(^"){1}/, '');
        }
        data[i] = [
          data[i][0],
          data[i][1],
          data[i].slice(2, data[i].length).join(" ").replace(/("$){1}/g, '').trim() || ""
        ];
        //separate out reactions
        if (/^(loved|liked|disliked|laughed at|emphasized|questioned)\s(“.{0,}”|an image|a movie|digital touch message)/i.test(data[i][2])) {
          text_analyzer.data.texts.reactions.reactions.push(data[i][2]);
          data.splice(i, 1);
          i--;
        } else {
          text_analyzer.data.text.push(data[i][2]);
          var words = text_analyzer.utilities.splitWords(data[i][2]);
          for (var j = 0; j < words.length; j++) {
            text_analyzer.data.words.raw.push(text_analyzer.utilities.stripPunctuation(words[j]));
          }
        }
      }

      text_analyzer.data.texts.texts = data;
      text_analyzer.data.texts.reactions.ngrams = text_analyzer.utilities.ngramify(text_analyzer.data.texts.reactions.reactions);
      delete text_analyzer.data.texts.reactions.reactions;
      //Top Texters
      text_analyzer.data.texts.texters = text_analyzer.utilities.ngramify(
        text_analyzer.data.texts.texts.map(v => {
          return v[0];
        }).filter(Boolean));

      var clone = text_analyzer.data.texts.texts.map(v => {
        if (v[1] !== undefined) {
          var split = v[1].split(', ');
          if (split[1] !== undefined) {
            var time = split[1].split(':');
            time[0] = Number(time[0]);
            var meridiem = time[1].split(' ')[1];
            if (meridiem === 'PM' && time[0] !== 12) {
              time = time[0] + 12;
            } else if (meridiem === 'AM' && time[0] === 12) {
              time = 0;
            } else {
              time = time[0];
            }
            return [v[0], split[0], time];
          }
        }
      });
      clone.sort(function(a, b) {
        if (a[0] === b[0]) {
          if (a[1] === b[1]) {
            return (b[2] < a[2]) ? 1 : -1;
          }
          return (b[1] < a[1]) ? 1 : -1;
        } else {
          return (b[0] < a[0]) ? 1 : -1;
        }
      });
      clone.filter(Boolean);
      var texter, count, prev, prev2, obj,
        times = [];
      for (i = 0; i < clone.length; i++) {
        if (clone[i] !== undefined) {
          if (clone[i][0] !== prev || i === clone.length - 1) {
            if (i > 0) {
              text_analyzer.data.texts.capita.push([texter, obj]);
            }
            texter = clone[i][0];
            obj = {};
          } else {
            if (clone[i][1] !== prev2) {
              if (i > 0) {
                obj[clone[i][1]] = count;
              }
              count = 1;
            } else {
              count++;
            }
            prev2 = clone[i][1];
          }
          prev = clone[i][0];
          times.push(clone[i][2]);
        }
      }
      text_analyzer.data.texts.capita.push([texter, obj]);
      text_analyzer.data.texts.capita = JSON.parse(JSON.stringify(text_analyzer.data.texts.capita));
      for (j = 0; j < text_analyzer.data.texts.capita.length; j++) {
        for (var date in text_analyzer.data.texts.capita[j][1]) {
          if (text_analyzer.data.texts.daily.hasOwnProperty(date)) {
            text_analyzer.data.texts.daily[date] += text_analyzer.data.texts.capita[j][1][date];
          } else {
            text_analyzer.data.texts.daily[date] = text_analyzer.data.texts.capita[j][1][date];
          }
        }
      }
      text_analyzer.data.texts.weekly = [];
      for (j = 0; j < text_analyzer.data.texts.capita.length; j++) {
        for (date in text_analyzer.data.texts.daily) {
          if (!text_analyzer.data.texts.capita[j][1].hasOwnProperty(date)) {
            text_analyzer.data.texts.capita[j][1][date] = 0;
          }
        }
        text_analyzer.data.texts.streaks[text_analyzer.data.texts.capita[j][0]] = text_analyzer.utilities.streaks(text_analyzer.data.texts.capita[j][1]);
      }
      for (date in text_analyzer.data.texts.daily) {
        for (var k = 0; k < text_analyzer.data.texts.daily[date]; k++) {
          text_analyzer.data.texts.weekly.push((new Date((new Date(date)).getTime())).getDay());
        }
      }
      text_analyzer.data.texts.streaks['daily'] = text_analyzer.utilities.streaks(text_analyzer.data.texts.daily);
      text_analyzer.data.texts.hourly = text_analyzer.utilities.ngramify(times);

      for (i = 0; i < text_analyzer.data.texts.hourly.length; i++) {
        var hour = text_analyzer.data.texts.hourly[i][0];
        if (hour > 12) {
          hour -= 12;
          hour += ' PM';
        } else if (hour === 0) {
          hour = '12 AM';
        } else {
          hour += ' AM';
        }
        text_analyzer.data.texts.hourly[i][0] = hour;
      }
      text_analyzer.data.texts.weekly = text_analyzer.utilities.ngramify(text_analyzer.data.texts.weekly);
      var daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      for (i = 0; i < text_analyzer.data.texts.weekly.length; i++) {
        text_analyzer.data.texts.weekly[i][0] = daysOfTheWeek[text_analyzer.data.texts.weekly[i][0]];
      }

      text_analyzer.decode.BASE();
      delete text_analyzer.data.texts.texts;
    }
  },
  generate: {
    overview() {
      var html = '';

      function card(title, content) {
        return `<div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-6 mdc-layout-grid__cell--span-8-tablet">
									<div class="mdc-card mdc--full-height">
									  <section class="mdc-card__primary">
									    <h1 class="mdc-card__title mdc-card__title--large">${title}</h1>
									  </section>
									  <section class="mdc-card__supporting-text">
									    ${content}
									  </section>
									</div>
								</div>`;
      }
      html += card(`Categories`, (function() {
        var string = '<ul class="mdc-list unicode">';
        var header = `<li class="mdc-list-item">
									<i class="mdc-list-item__start-detail material-icons">dashboard</i>
									<span class="mdc-list-item__text">
										Category
										<span class="mdc-list-item__text__secondary">Total | Unique</span>
									</span>
								</li>
								<li role="separator" class="mdc-list-divider"></li>`;
        string = string.concat(header);
        var item;
        for (var total in text_analyzer.data.totals) {
          var unique;
          if (total === 'all') {
            unique = text_analyzer.data.words.ngrams.length;
          } else if (total === 'reactions') {
            unique = text_analyzer.data.texts.reactions.ngrams.length;
          } else if (total === 'toptexters') {
            unique = text_analyzer.data.texts.texters.length;
          } else {
            unique = text_analyzer.data.categories[total].length;
          }
          var iconType = 'material-icons';
          if (icons[total].constructor === Array) {
            iconType = 'noto-icons ' + total; //some icons have to use a different font
          }
          item = `<li class="mdc-list-item">
										<i class="mdc-list-item__start-detail ${iconType}">${icons[total]}</i>
										<span class="mdc-list-item__text">${text_analyzer.data.titles[total]}
                      <span class="mdc-list-item__text__secondary">${text_analyzer.data.totals[total] + ' | ' + unique}</span>
										</span>
									</li>`;
          string = string.concat(item);
          string.concat(+': ' + +'<br>');
        }
        return string;
      })());
      if (text_analyzer.data.texts) {
        html += `<div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-6 mdc-layout-grid__cell--span-8-tablet twin-parent">`;
      }

      html += card('Character and Word Count', `<ul class="mdc-list unicode">
          <li class="mdc-list-item">Number of characters (including spaces): ${text_analyzer.data.characters.raw}</li>
          <li class="mdc-list-item">Number of characters (without spaces): ${text_analyzer.data.characters.nospaces}</li>
          <li class="mdc-list-item">Number of words: ${text_analyzer.data.totals['all']}</li>
          <li class="mdc-list-item">Number of unique words: ${text_analyzer.data.words.ngrams.length}</li>
          <li class="mdc-list-item">Average word length: ${(text_analyzer.data.characters.nospaces / text_analyzer.data.words.length, 4).toFixed(2)} characters</li>
          <li class="mdc-list-item">Number of sentences: ${text_analyzer.data.sentences}</li>
          <li class="mdc-list-item">Average sentence length: ${(text_analyzer.data.sentences > 0 ? (text_analyzer.data.totals['all'] / text_analyzer.data.sentences).toFixed(2) : 'N/A')} words</li>
        </ul>`);
      if (text_analyzer.data.texts) {
        html += `<div class="mdc-card twin">
							<section class="mdc-card__primary">
								<h1 class="mdc-card__title mdc-card__title--large">Texts</h1>
							</section>
							<section class="mdc-card__supporting-text">
								<ul class="mdc-list unicode">
                  <li class="mdc-list-item">Texters: ${text_analyzer.data.texts.texters.length}</li>
                  <li class="mdc-list-item">Total Texts Sent: ${text_analyzer.data.texts.texts.length}</li>
                  <li class="mdc-list-item">Average Words per Text: ${(text_analyzer.data.totals['all'] / text_analyzer.data.texts.texts.length).toFixed(2)}</li>
                  </ul>
				      </section>
						</div></div>`;
      }

      html += `<div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12 mdc-layout-grid__cell--span-8-tablet">
								<div class="mdc-card mdc--full-height">
									<section class="mdc-card__primary">
										<h1 class="mdc-card__title mdc-card__title--large">Meta Analysis</h1>
									</section>
									<section class="mdc-card__supporting-text">
										Created on ${(new Date().toLocaleDateString("en-ca", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short"
      }))} in %%benchmark%%<br>Analyzed with <i class="mdc-theme--accent material-icons">favorite</i> with <a class="mdc-theme--accent" href="//steventang.tk/wapps/textanalyzer/">Text Analyzer</a>
									</section>
								</div>
							</div>`; // %%benchmark%% to be replaced with benchmark time after analysis is completed
      text_analyzer.data.html.overview = html.replace(/(\\n|\\t)/gm, ''); //removes newlines and tabs to reduce memory / file size
    },
    categories() {
      text_analyzer.data.html.all = text_analyzer.generate.category('all');
      text_analyzer.data.html.hashtags = text_analyzer.generate.category('hashtags');
      text_analyzer.data.html.ats = text_analyzer.generate.category('ats');
      text_analyzer.data.html.emojis = text_analyzer.generate.category('emojis');
      text_analyzer.data.html.languages = text_analyzer.generate.category('languages');
      text_analyzer.data.html.numbers = text_analyzer.generate.category('numbers');
      text_analyzer.data.html.locations = text_analyzer.generate.category('locations');
      text_analyzer.data.html.time = text_analyzer.generate.category('time');
      text_analyzer.data.html.people = text_analyzer.generate.category('people');
      text_analyzer.data.html.urls = text_analyzer.generate.category('urls');
      text_analyzer.data.html.emails = text_analyzer.generate.category('emails');
      text_analyzer.data.html.phonenumbers = text_analyzer.generate.category('phonenumbers');
      if (text_analyzer.data.texts) {
        text_analyzer.data.html.reactions = text_analyzer.generate.category('reactions');
        text_analyzer.data.html.toptexters = text_analyzer.generate.category('toptexters');
      }
    },
    category(category) {
      var ul = '<ul id="categoryList" class="mdc-list mdc-list--two-line unicode ';
      var list = '',
        data;
      switch (category) {
        case 'all':
          data = text_analyzer.data.words.ngrams;
          break;
        case 'reactions':
          data = text_analyzer.data.texts.reactions.ngrams;
          break;
        case 'toptexters':
          data = text_analyzer.data.texts.texters;
          ul += 'mdc-list--contains-end-detail-large';
          break;
        default:
          data = text_analyzer.data.categories[category];
          break;
      }
      if (['urls', 'emails', 'phonenumbers', 'locations'].indexOf(category) > -1) {
        ul += 'mdc-list--contains-end-detail-small';
      }
      ul += '"></ul>';

      var header = `<li class="mdc-list-item">
								<i class="mdc-list-item__start-detail chart-rank">Rank</i>
								<span class="mdc-list-item__text">
									Term
									<span class="mdc-list-item__text__secondary">Count : Percentage</span>
								</span>
							</li>
							<li role="separator" class="mdc-list-divider"></li>`;
      list = list.concat(header);
      var i, item;
      if (data.length < 1) {
        item = `<li class="mdc-list-item">
									<span class="mdc-list-item__text">
									No Data Available
									</span>
								</li>`;
        list = list.concat(item);
      } else if (['urls', 'emails', 'phonenumbers', 'locations'].indexOf(category) > -1) {
        var protocol = '',
          icon = '',
          className = '';
        switch (category) {
          case 'emails':
            protocol = 'mailto:';
            icon = 'email';
            break;
          case 'locations':
            protocol = 'https://www.google.com/maps/search/?api=1&query=';
            className = 'icon-google_maps';
            break;
          case 'urls':
            icon = 'open_in_new';
            break;
          case 'phonenumbers':
            protocol = 'tel:';
            icon = 'phone';
        }
        for (i = 0; i < data.length; i++) {
          var url = data[i][0];
          if (category === 'urls') { //lets browser choose the web protocol
            url = url.replace('https://', '');
            url = url.replace('http://', '');
            url = '//' + url;
          }
          item = `<li class="mdc-list-item">
										<i class="mdc-list-item__start-detail chart-rank">${(i + 1)}</i>
										<span class="mdc-list-item__text">` +
            data[i][0] +
            `<span class="mdc-list-item__text__secondary">` +
            data[i][1] + ' : ' + (data[i][1] / text_analyzer.data.totals[category] * 100).toFixed(3) + '%' + //rouund to three decimal places
            `</span>
										</span>
										<a href=${protocol + encodeURI(url)} target="_blank" class="mdc-list-item__end-detail mdc-ripple-surface material-icons ${className}" aria-label="Open In New Window"  data-mdc-auto-init="MDCRipple" data-mdc-ripple-is-unbounded>
										 ${icon}
										</a>
									</li>`;
          list = list.concat(item);
        }
      } else {
        for (i = 0; i < data.length; i++) {
          item = `<li class="mdc-list-item">
										<i class="mdc-list-item__start-detail chart-rank">${i + 1}</i>
										<span class="mdc-list-item__text">
									    ${data[i][0]}
									    <span class="mdc-list-item__text__secondary">${data[i][1] + ' : ' + (data[i][1] / text_analyzer.data.totals[category] * 100).toFixed(3) + '%'}</span>
									  </span>
									`;
          if (category === 'toptexters') {
            item += ` <div class="mdc-list-item__end-detail streaks">
									      ${text_analyzer.data.texts.streaks[data[i][0]]} 🔥
									    </div>`;
          }
          item += '</li>';
          list = list.concat(item);
        }
      }
      return [ul.replace(/(\\n|\\t)/gm, ''), list.replace(/(\\n|\\t)/gm, '')]; //remove line breaks and tabs to save memory
    },
    totals() { //calculates number of words in datasets
      text_analyzer.data.totals.all = text_analyzer.utilities.ngramSum(text_analyzer.data.words.ngrams);
      for (var category in text_analyzer.data.categories) {
        text_analyzer.data.totals[category] = text_analyzer.utilities.ngramSum(text_analyzer.data.categories[category]);
      }
      if (text_analyzer.data.texts) {
        text_analyzer.data.totals.reactions = text_analyzer.utilities.ngramSum(text_analyzer.data.texts.reactions.ngrams);
        text_analyzer.data.totals.toptexters = text_analyzer.utilities.ngramSum(text_analyzer.data.texts.texters);
      }
    }
  },
  lexicon: { //manual lexicon to augment nlp's default lexicon
    emily: 'FemaleName',
    emoly: 'FemaleName',
    em: 'FemaleName',
    mary: 'FemaleName',
    sophie: 'FemaleName',
    ty: 'Removed',
    jenny: 'FemaleName',

    yoctosecond: 'Date',
    yoctoseconds: 'Date',

    edo: 'Place',
    leduc: 'Place',
    alberta: 'Place',
    'british columbia': 'Place',
    manitoba: 'Place',
    'new brunswick': 'Place',
    'newfoundland and labrador': 'Place',
    'nova scotia': 'Place',
    ontario: 'Place',
    'prince edward island': 'Place',
    quebec: 'Place',
    québec: 'Place',
    saskatchewan: 'Place',
    'northwest territories': 'Place',
    nunavut: 'Place',
    yukon: 'Place',
    africa: 'Place',

    riverbend: 'Place',
    starbucks: 'Place',
    mall: 'Place',
    wem: 'Place',
    school: 'Place',
    kfc: 'Place',
    mcdonalds: 'Place',
    mcds: 'Place',
    church: 'Place',
    park: 'Place',
    grad: 'Place',
    't&t': 'Place',
    oleskiw: 'Place',
    'los angeles': 'Place',
    'las vegas': 'Place',
    'san francisco': 'Place',

    potter: 'MaleName',
    dumbledore: 'MaleName',
    ron: 'MaleName',
    weasley: 'MaleName',
    hermoine: 'FemaleName',
    gryffindor: 'MaleName',
    ravenclaw: 'FemaleName',
    hufflepuff: 'FemaleName',
    slytherin: 'MaleName',
    captain: 'MaleName',
    voldemort: 'MaleName',
    snape: 'MaleName',
    dobby: 'MaleName',

    swanice: 'FemaleName',
    cliff: 'Removed',
    tristan: 'MaleName',
    xyantul: 'FemaleName',
    kay: 'Removed',
    maia: 'FemaleName',
    pavlo: 'MaleName'
  },
  utilities: {
    ngramify(array) {
      var word, count, prev, ngrams = [];
      array.sort(); //sorts array
      for (var i = 0; i < array.length; i++) {
        if (array[i] !== prev) { //if word is not the same as previous
          if (i > 0) {
            ngrams.push([word, count]);
          }
          word = array[i];
          count = 1;
        } else {
          count++; //if array element is the same increment count
        }
        prev = array[i];
      }
      ngrams.push([word, count]);
      ngrams.sort(function(a, b) { //sort ngrams by count, then alphabetically(unicode codepoint)
        if (a[1] === b[1]) {
          if (a[0] === b[0]) {
            return 0;
          } else {
            return a[0] > b[0] ? 1 : -1;
          }
        } else {
          return b[1] > a[1] ? 1 : -1;
        }
      });
      return ngrams;
    },
    splitWords(input) {
      /*eslint no-control-regex: "off"*/
      //inserts space before and after non-latin characters, allows for proper ngramming of emojis, chinese, etc
      input = input.replace(/([\u0000-\u05FF\u1E00-\u22FF\u27C0-\u2BFF\uFE20-\uFFEF]+)/g, ' $1 ');

      //replaces other whitespace characters with space(" ") character
      input = input.replace(/\t/g, ' ');
      input = input.replace(/[ ]{2,}/g, ' ');
      input = input.replace(/\n/g, ' ');
      input = input.replace(/\x00/g, '');

      var array = input.split(' ');
      for (var j = 0; j < array.length; j++) {
        //seperates all non-latin characters
        if (/[^\u0000-\u05FF\u1E00-\u22FF\u27C0-\u2BFF\uFE20-\uFFEF]+/.test(array[j])) {
          array[j] = spliddit(array[j]);
        }
      }

      array = array.flat(); //add all sub-array elements into array [a, [b, c]] => [a, b, c]

      var honorifics = [
        "mr",
        "mrs",
        "miss",
        "ms",
        "mx",
        "dr",
        "hon",
        "prof",
        "st",
        "capt",
        "captain",
        "gov",
        "jr",
        "sen",
        "maj",
        "mister",
        "sir",
        "sr",
        "surg"
      ];
      //recombine words that include spaces
      for (var i = 0; i < array.length; i++) {
        if (honorifics.indexOf(array[i]) !== -1 || honorifics.indexOf(array[i].replace('.', '')) !== -1) { //recombines honorifics with name
          array[i] = array[i].concat(' ', array[i + 1]);
          array.splice(i + 1, 1);
        } else if (/\d/.test(array[i]) && /\d/.test(array[i + 1])) { // recombines numbers like 1 000
          array[i] = array[i].concat(' ', array[i + 1]);
          array.splice(i + 1, 1);
          i--;
        } else if ((array[i] === 'oleskiw' && array[i + 1] === 'park') || //specific cases for recombining names
          (array[i] === 'los' && array[i + 1] === 'angeles') ||
          (array[i] === 'las' && array[i + 1] === 'vegas') ||
          (array[i] === 'san' && array[i + 1] === 'francisco')) {
          array[i] = array[i].concat(' ', array[i + 1]);
          array.splice(i + 1, 1);
        }
      }
      array = array.filter(Boolean).filter((a) => a == " " ? false : true); // filter out empty elements
      for (i = 0; i < array.length; i++) {
        array[i] = array[i]
          .replace(/^["'\\(*-]+|["'\\(*-]+$/, '') //remove symbols at beginning or end of line
          .replace(/('s$)/g, ''); //remove apostrophe s
        array[i] = array[i].replace(/[^\s]+/g, function(match) { //lowercase all words that are not urls
          if (/^(([a-z]+:\/\/)?(([a-z0-9-]+\.)+([a-z]{2}|aero|arpa|asia|biz|com|club|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|top|xyz|travel|local|internal))(:[0-9]{1,5})?(\/[a-zA-Z0-9_.~-]+)*(\/([a-z0-9_.#&+'()$!*'-]*)(\?[a-z0-9+_.%=&amp;-]*)?)?(#[a-zA-Z0-9!$&'()*+.=-_~:/?]*)?)(\s+|$)/.test(match)) {
            return match;
          }
          return match.toLowerCase();
        });
      }
      return array;
    },
    sanitize(input) { //remove escape seqeunces
      input = input
        .replace(/\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/%lf%|%LF%/g, ' ');
      return input;
    },
    streaks(capita) {
      var streak = [0],
        count = 0;
      var dates = (Object.keys(capita).map(key => {
        if (capita[key] > 0) {
          return key;
        }
      })).filter(Boolean);
      for (var i = 0; i < dates.length; i++) {
        if ((new Date(dates[i + 1])).getTime() - (new Date(dates[i])).getTime() < 86400001) {
          count++;
        } else if (count > 0) {
          streak.push(count);
        }
      }
      return Math.max(...streak);
    },
    stripPunctuation(input) {
      return input.replace(/[?.!,。？]+$/, ''); //removes punctuation from the end of the string
    },
    ngramSum(data) {
      var sum = 0;
      for (var i = 0; i < data.length; i++) {
        sum += data[i][1];
      }
      return sum;
    }
  }
};

self.addEventListener('message', message => {
  var data = JSON.parse(message.data);
  var raw = text_analyzer.utilities.sanitize(data.raw);
  emojiRegex = new RegExp(data.regex, 'u');
  if (data.delimiter.length > 0) {
    text_analyzer.decode.SMS(raw, data.delimiter); //if there is a delimiter do a SMS analysis
  } else {
    text_analyzer.decode.PT(raw); //otherwise do a plain text analysis
  }
  self.postMessage(JSON.stringify(text_analyzer.data)); //reply with analyzed data
  self.close();
});