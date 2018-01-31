'use strict';

/**
 * @ngdoc overview
 * @name elliotdashboardApp
 * @description
 * # elliotdashboardApp
 *
 * Main module of the application.
 */
var app = angular
  .module('elliotdashboardApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'ngWebSocket',
    'angularMoment',
    'btford.socket-io',
    'toastr'
  ])
  .config(function ($routeProvider, $httpProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'main'
      })
      .when('/login', {
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl',
        controllerAs: 'login'
      })
      .otherwise({
        redirectTo: '/login'
      });

    $httpProvider.interceptors.push('authInterceptor');

    $httpProvider.defaults.headers.common = {};
    $httpProvider.defaults.headers.post = {};
    $httpProvider.defaults.headers.put = {};
    $httpProvider.defaults.headers.patch = {};

  });