/* global text_analyzer angular mdc WordCloud Chart*/
var TA_App = angular.module('TA_App', ['ngRoute']);
var fragments; //HTML fragments used to improve performance
//Angular's $routeProvider maps url hashes (the part after the #) to html files, allows changing html content without reloading the page
TA_App.config(['$routeProvider', '$locationProvider',
  function($routeProvider, $locationProvider) {
    $routeProvider
      .when('/input', {
        templateUrl: 'input.html'
      })
      .when('/overview', {
        templateUrl: 'overview.html'
      })
      .when('/all', {
        templateUrl: 'category.html'
      })
      .when('/hashtags', {
        templateUrl: 'category.html'
      })
      .when('/ats', {
        templateUrl: 'category.html'
      })
      .when('/emojis', {
        templateUrl: 'category.html'
      })
      .when('/people', {
        templateUrl: 'category.html'
      })
      .when('/locations', {
        templateUrl: 'category.html'
      })
      .when('/time', {
        templateUrl: 'category.html'
      })
      .when('/urls', {
        templateUrl: 'category.html'
      })
      .when('/emails', {
        templateUrl: 'category.html'
      })
      .when('/phonenumbers', {
        templateUrl: 'category.html'
      })
      .when('/languages', {
        templateUrl: 'category.html'
      })
      .when('/numbers', {
        templateUrl: 'category.html'
      })
      .when('/toptexters', {
        templateUrl: 'category.html'
      })
      .when('/reactions', {
        templateUrl: 'category.html'
      })
      .when('/wordcloud', {
        templateUrl: 'wordcloud.html'
      })
      .when('/info', {
        templateUrl: 'info.html'
      })
      .otherwise({
        redirectTo: '/input'
      });
    $locationProvider.hashPrefix('');
  }
]);

TA_App.controller('mainController', ['$scope', function($scope) {
  $scope.$on('$viewContentLoaded', function() { //fires on view change
    if (['#/input', '#/info'].indexOf(window.location.hash) < 0 && !text_analyzer.data.hasOwnProperty('categories')) {
      window.alert('Please create a text analysis first.');
      ux.navigate('input');
      return;
    }
    window.scrollTo(0, 0); //scroll to top of page

    fragments = undefined;
    document.removeEventListener('scroll', ux.display.onscroll);

    switch (window.location.hash) {
      case '#/overview':
        ux.display.overview();
        break;
      case '#/wordcloud':
        ux.display.wordcloud();
        break;
      case '#/input':
        break;
      default:
        ux.display.category();
        break;
    }
    window.mdc.autoInit(document.querySelector('.mdc-content-changes')); //initalizes click ripple effect
  });
}]);
var ux = {
  display: {
    appendList: function() {
      //instead of rendering 40000 unique ngrams, we display 1024 HTML fragments at a time to improve performance!
      var list = document.getElementById('categoryList');
      var fragmentsHTMLs = fragments.splice(0, 1024);
      for (var i = 0; i < fragmentsHTMLs.length; i++) {
        var fragment = document.createElement('li');
        fragment.innerHTML = fragmentsHTMLs[i];
        list.appendChild(fragment);
      }
      if (fragments.length === 0) { //once all fragments have been displayed hide loading animation
        var dataLoader = document.getElementById('dataLoader');
        if (dataLoader) {
          dataLoader.parentElement.removeChild(document.getElementById('dataLoader'));
        }
        document.removeEventListener('scroll', ux.display.onscroll);
      }
    },
    onscroll: function() {
      //display more fragments when user scrolls to bottom of the page
      if (document.body.offsetHeight - (window.scrollY + Math.max(document.documentElement.clientHeight, window.innerHeight || 0)) < -32) {
        ux.display.appendList();
      }
    },
    category: function() {
      document.querySelector('html').classList.remove('scroll-lock');
      var title = window.location.hash.substr(2, location.hash.length);
      document.getElementById('header').innerText = text_analyzer.data.titles[title];
      document.getElementById('total').innerText = text_analyzer.data.totals[title];
      var data = text_analyzer.data.html[title];

      ux.display.chart.all(title); //generates the pie graph

      var listContainer = document.getElementById('categoryListContainer');
      listContainer.classList.remove('loading-card', 'mdc-elevation--z0');
      listContainer.innerHTML = data[0];

      //convert from String to an array of HTML fragment Strings 
      fragments = data[1].split('</li>').map(function(value) {
        return value + '</li>';
      });

      ux.display.appendList();
      document.addEventListener('scroll', ux.display.onscroll);
    },
    chart: {
      //uses Chart.js to create the graphs
      all: function(title) {
        var dataset;
        switch (title) {
          case 'all':
            dataset = text_analyzer.data.words.ngrams.slice(0, 30);
            break;
          case 'toptexters':
            dataset = text_analyzer.data.texts.texters.slice(0, 3);
            document.getElementById('total').innerHTML += '<br>' + text_analyzer.data.texts.streaks["daily"] + ' 🔥';
            break;
          case 'reactions':
            dataset = text_analyzer.data.texts.reactions.ngrams.slice(0, 12);
            break;
          case 'urls':
            dataset = text_analyzer.data.categories[title].slice(0, 12);
            break;
          default:
            dataset = text_analyzer.data.categories[title].slice(0, 30);
            break;
        }
        document.getElementById('chartInfo').innerText = 'Top ' + dataset.length + ' Pie Chart';
        var chartData = {};
        if (title === 'toptexters') { //podium for top texters
          if (dataset.length > 2) {
            new Chart(document.getElementById('categoryChart'), {
              type: 'bar',
              data: {
                datasets: [{
                  label: dataset[1][0],
                  data: [dataset[1][1]],
                  backgroundColor: ['#E5E4E2']
                }, {
                  label: dataset[0][0],
                  data: [dataset[0][1]],
                  backgroundColor: ['#FFD700']
                }, {
                  label: dataset[2][0],
                  data: [dataset[2][1]],
                  backgroundColor: ['#CD7F32']
                }],
                labels: ['']
              },
              options: {
                maintainAspectRatio: false,
                scales: {
                  yAxes: [{
                    ticks: {
                      beginAtZero: true
                    }
                  }]
                },
                title: {
                  display: false
                },
              }
            });
            document.getElementById('chartContainer').style.minHeight = '20vh';
            document.getElementById('chartInfo').innerText = 'Podium';
          } else {
            document.getElementById('chartContainer').style.display = 'none';
          }
          //timeline for sms analyses
          if (text_analyzer.data.texts.capita.length > 0) {
            var datasets = [],
              i = 0;

            for (var data in text_analyzer.data.texts.capita) {
              datasets.push({
                label: text_analyzer.data.texts.capita[data][0],
                data: Object.keys(text_analyzer.data.texts.capita[data][1]).map(function(key) {
                  return [key, text_analyzer.data.texts.capita[data][1][key]];
                }).sort(function(a, b) {
                  return ((new Date(b[0])).getTime() < (new Date(a[0])).getTime()) ? 1 : -1;
                }).map(function(v) {
                  return v[1];
                }),
                fill: false
              });
            }

            datasets.push({
              label: 'Everyone',
              data: Object.keys(text_analyzer.data.texts.daily).map(function(key) {
                return [key, text_analyzer.data.texts.daily[key]];
              }).sort(function(a, b) {
                return ((new Date(b[0])).getTime() < (new Date(a[0])).getTime()) ? 1 : -1;
              }).map(function(v) {
                return v[1];
              }),
              fill: 'origin',
              backgroundColor: '#000',
              borderColor: '#000'
            });

            chartData = {
              datasets: datasets,
              labels: Object.keys(text_analyzer.data.texts.daily).map(function(key) {
                return key;
              }).sort(function(a, b) {
                return ((new Date(b)).getTime() < (new Date(a)).getTime()) ? 1 : -1;
              })
            };

            for (i = 0; i < chartData.datasets.length - 1; i++) {
              chartData.datasets[i].backgroundColor = 'hsl(' + Math.floor(i / chartData.datasets.length * 330) + ', ' +
                Math.round(100 - 5 * (i % 2 ? 0 : 1)) + '%, ' +
                Math.round(50 - 5 * (i % 2 ? 0 : 1)) + '%)';
              chartData.datasets[i].borderColor = chartData.datasets[i].backgroundColor;
            }

            new Chart(document.getElementById('categoryChart2'), {
              type: 'line',
              data: chartData,
              options: {
                hover: {
                  animationDuration: 0,
                },
                responsiveAnimationDuration: 0,
                elements: {
                  point: {
                    radius: 2
                  }
                },
                scales: {
                  xAxes: [{
                    type: 'time',
                    time: {
                      displayFormats: {
                        day: 'MMM YYYY'
                      },
                      tooltipFormat: 'MMMM D YYYY'
                    }
                  }],
                  yAxes: [{
                    max: 10
                  }]
                }
              }
            });
            document.querySelector('.chart-container--2').style.display = 'block';
          }
          if (text_analyzer.data.texts.weekly.length > 0) {
            document.querySelector('.chart-container--3').style.display = 'block';
            ux.display.chart.pie(document.getElementById('categoryChart3'), text_analyzer.data.texts.weekly);
          }
          if (text_analyzer.data.texts.hourly.length > 0) {
            document.querySelector('.chart-container--4').style.display = 'block';
            ux.display.chart.pie(document.getElementById('categoryChart4'), text_analyzer.data.texts.hourly);
          }
        } else {
          //for plaintext categories that have content create a pie chart
          if (dataset.length < 1) {
            document.getElementById('chartInfo').style.display = 'none';
            document.getElementById('chartContainer').style.minHeight = '0';
            document.getElementById('chartContainer').style.height = '0';
          } else {
            ux.display.chart.pie(document.getElementById('categoryChart'), dataset);
          }
        }
      },
      pie: function(element, dataset) {
        var d = dataset.map(function(v) {
          return v[1];
        });
        new Chart(element, {
          type: 'pie',
          data: {
            datasets: [{
              data: d,
              backgroundColor: (function() {
                var colours = [];
                for (var i = 0; i < d.length; i++) {
                  colours.push('hsl(' + Math.floor(i / d.length * 360) + ', 100%, 50%)');
                }
                return colours;
              })()
            }],
            labels: dataset.map(function(v) {
              return v[0];
            })
          },
          options: {
            maintainAspectRatio: false,
            tooltips: {
              callbacks: {
                label: function(tooltipItem, data) {
                  var dataset = data.datasets[tooltipItem.datasetIndex];
                  var total = dataset.data.reduce(function(previousValue, currentValue) {
                    return previousValue + currentValue;
                  });
                  var currentValue = dataset.data[tooltipItem.index];
                  var precentage = Math.round((currentValue / total * 100));
                  return ' ' + data.labels[tooltipItem.index] + ': ' + currentValue + ' | ' + precentage + "%";
                }
              }
            }
          }
        });
      }
    },
    overview: function() {
      document.querySelector('html').classList.remove('scroll-lock');
      var overview = document.createElement('div');
      document.getElementById('content').appendChild(overview);
      overview.outerHTML = text_analyzer.data.html.overview;
      var dataLoader = document.getElementById('dataLoader');
      dataLoader.parentElement.parentElement.removeChild(dataLoader.parentElement); //hide loading animation once loaded
    },
    wordcloud: function() {
      document.querySelector('html').classList.add('scroll-lock');
      var wordCloudElement = document.getElementById('wordcloud');
      var input = text_analyzer.data.words.ngrams.slice(0, 1024);
      //uses a WordCloud library* to draw a pretty WordCloud *https://github.com/timdream/wordcloud2.js/
      WordCloud([wordCloudElement], {
        color() {
          return 'hsl(' + Math.floor(Math.random() * 360) + ', 75%, 50%)'; //randomly choose a pretty colour
        },
        fontFamily: "Roboto, 'Noto Sans SC', 'Noto Sans TC', 'Noto Sans KR', 'Noto Sans JP', 'Noto Kufi Arabic', 'Noto Sans Tibetan', sans-serif",
        gridSize: 1,
        list: input,
        minSize: 4,
        wait: 1000 / input.length,
        weightFactor(size) {
          //size is computed relative to largest word which is set at font-size of 75% of smaller of the element dimensions
          return size / input[0][1] * Math.min(wordCloudElement.offsetWidth, wordCloudElement.offsetHeight) * .75;
        }
      });
    }
  },
  init: function() {
    window.mdc.autoInit(); //initalizes button ripples
    var drawer = new mdc.drawer.MDCTemporaryDrawer(document.querySelector('.mdc-temporary-drawer'));
    document.querySelector('.menu').addEventListener('click', function() {
      var selected = document.querySelector('.mdc-list-item[href="' + window.location.hash.replace('/', '') + '"]');
      if (selected) {
        selected.classList.add('mdc-temporary-drawer--selected'); //highlights selected menu item
      }
      drawer.open = drawer.open ? false : true; //toggle drawer open
    });

    var listItems = document.querySelectorAll('.mdc-temporary-drawer a.mdc-list-item');
    for (var i = 0; i < listItems.length; i++) {
      listItems[i].addEventListener('click', function() {
        //remove highlight from previously selected menu item
        var selected = document.querySelector('.mdc-temporary-drawer--selected');
        if (selected) {
          selected.classList.remove('mdc-temporary-drawer--selected');
          drawer.open = false; //close drawer
        }
      });
    }

    //unfocus search box when user clicks again
    function unfocus_searchbox() {
      document.querySelector('.search-box').classList.remove('focus');
      window.removeEventListener('click', unfocus_searchbox);
    }

    //focus search box on click
    document.querySelector('.search-box').addEventListener('click', function() {
      document.querySelector('.search-box').classList.add('focus');
      window.addEventListener('click', unfocus_searchbox);
    });

    document.getElementById('search').addEventListener('keyup', (event) => {
      if (event.keyCode == 13) {
        ux.search(document.getElementById('search').value); //search when user hits enter
      }
    });

    //show a back to top button when user scrolls to bottom of page
    document.addEventListener('scroll', function() {
      var btn = document.getElementById('backtotop');
      if (window.scrollY > Math.max(document.documentElement.clientHeight, window.innerHeight || 0) && !btn.className.includes('visible')) {
        btn.classList.add('visible');
        if (!('mdc-ripple-upgraded' in btn.classList)) {
          setTimeout(function() {
            new mdc.ripple.MDCRipple(btn);
          }, 240);
        }
      } else if (window.scrollY < 64 && btn.className.includes('visible')) {
        btn.classList.remove('visible');
      }
    });

    Chart.defaults.global.defaultFontFamily = "Roboto, 'Noto Sans SC', 'Noto Sans TC', 'Noto Sans KR', 'Noto Sans JP', 'Noto Kufi Arabic', 'Noto Sans Tibetan', sans-serif";

      //only add Google Analytics and servicewoker for caching when the host site is my own or localhost
    if (["steventang.tk", "localhost"].indexOf(window.location.hostname) > -1) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/wapps/textanalyzer/dev/serviceworker.js'); //caches files
      }
      (function(i, s, o, g, r, a, m) {
        i['GoogleAnalyticsObject'] = r;
        i[r] = i[r] || function() {
          (i[r].q = i[r].q || []).push(arguments);
        }, i[r].l = 1 * new Date();
        a = s.createElement(o), m = s.getElementsByTagName(o)[0];
        a.async = 1;
        a.src = g;
        m.parentNode.insertBefore(a, m);
      })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');
      ga('create', 'UA-82998524-1', 'auto');
      ga('set', 'page', location.pathname + location.hash);
      ga('send', 'pageview');
      window.addEventListener("hashchange", function() {
        ga('set', 'page', location.pathname + location.hash);
        ga('send', 'pageview');
      }, false);
    }
  },
  search(string) {
    function notfound() {
      //add a red line to indicate that the result was not found
      var searchBox = document.querySelector('.search-box');
      searchBox.classList.add('search-notfound');
      setTimeout(function() {
        searchBox.classList.remove('search-notfound');
      }, 500);
    }
    var hash = window.location.hash.substr(2, location.hash.length), dataset;
    switch (hash) {
      case 'all':
        dataset = text_analyzer.data.words.ngrams;
        break;
      case 'toptexters':
        dataset = text_analyzer.data.texts.toptexters;
        break;
      case 'reactions':
        dataset = text_analyzer.data.texts.reactions;
        break;
      case 'input':
      case 'info':
      case 'overview':
        notfound(); //no content to search on these pages
        return;
      default:
        dataset = text_analyzer.data.categories[hash];
        break;
    }
    //searches for string in dataset
    var index = dataset.map(function(v) {
      return v[0];
    }).indexOf(string.toLowerCase());

    if (index > -1) {
      var items = document.querySelectorAll("#categoryListContainer span.mdc-list-item__text");
      //continue adding elements until the element containing the string is in the dom(html)
      while (index + 1 > items.length) {
        ux.display.appendList();
        items = document.querySelectorAll("#categoryListContainer span.mdc-list-item__text");
      }
      items[index + 1].scrollIntoView();
      window.scrollBy(0, -80); //scroll offset of the header toolbar
      var drawer = new mdc.drawer.MDCTemporaryDrawer(document.querySelector('.mdc-temporary-drawer'));
      drawer.open = false;
    } else {
      notfound();
    }
  },
  navigate: function(index) {
    window.location.replace("#/" + index); //navigate between pages
  }
};
ux.init();
