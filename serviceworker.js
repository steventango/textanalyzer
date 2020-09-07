var surl = "/wapps/textanalyzer/dev/";
var CACHE = 'textanalyzercache-2';
var urlsToCache = [
  surl + 'index.html',
  surl + 'input.html',
  surl + 'info.html',
  surl + 'overview.html',
  surl + 'category.html',
  surl + 'wordcloud.html',
  surl + 'manifest.json',
  surl + 'serviceworker.js',
  surl + 'main-v2.css',
  surl + 'main-v2.js',
  surl + 'analyze-v2.js',
  '/shared/js/cookie.min.js',
  '/shared/js/emojiregex.min.js'
];

// Set the callback for the install step
self.addEventListener('install', function(event) {
  // Perform install steps, and precache
  event.waitUntil(
    caches.open(CACHE)
    .then(function(cache) {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
    .then(function(response) {
      // response found in cache, return response
      if (response) {
        return response;
      }

      //otherwise fetch the request over the network
      return fetch(event.request.clone()).then(
        function(response) {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response; //if not return the error
          }

          //cache response
          var responseToCache = response.clone();
          caches.open(CACHE)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        }
      );
    })
  );
});
