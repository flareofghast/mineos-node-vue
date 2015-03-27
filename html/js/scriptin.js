var app = angular.module("mineos", ['angularMoment']);
var connect_string = ':3000/';

/* directives */

app.directive('ngEnter', function () {
  //http://eric.sau.pe/angularjs-detect-enter-key-ngenter/
  return function (scope, element, attrs) {
    element.bind("keydown keypress", function (event) {
      if(event.which === 13) {
        scope.$apply(function (){
          scope.$eval(attrs.ngEnter);
        });

        event.preventDefault();
      }
    });
  };
});

/* filters */

app.filter('bytes_to_mb', function() {
  return function(bytes) {
    if (bytes == 0)
      return '0B';
    else if (bytes < 1024)
      return bytes + 'B';

    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));

    return (bytes / Math.pow(k, i)).toPrecision(3) + sizes[i];
  };
})

app.filter('seconds_to_time', function() {
  return function(seconds) {
    return moment.duration(seconds, "seconds").format();
  }
})

app.filter('time_from_now', function() {
  return function(seconds) {
    return moment(seconds).fromNow();
  }
})

/* controllers */

app.controller("Webui", ['$scope', 'socket', 'Servers', function($scope, socket, Servers) {
  $scope.page = 'dashboard';
  $scope.servers = Servers;
  $scope.current = null;

  /* watches */

  $scope.$watch(function(scope) { return scope.page },
    function(new_value, previous_value) {
      socket.emit($scope.current, 'page_data', new_value);
    }
  );

  /* computed variables */

  $scope.servers_up = function() {
    return $.map(Servers, function(instance, server_name) {
      if ('heartbeat' in instance)
        return instance.heartbeat.up;
    }).length
  }

  $scope.players_online = function() {
    var online = 0;
    $.each(Servers, function(server_name, instance) {
      if ('heartbeat' in instance)
        if (instance.heartbeat.ping.players_online)
          online += (instance.heartbeat.ping.players_online)
    })
    return online;
  }

  $scope.player_capacity = function() {
    var capacity = 0;
    $.each(Servers, function(server_name, instance) {
      if ('sp' in instance)
        capacity += instance.sp['max-players'];
    })
    return capacity;
  }

  /* socket handlers */

  socket.on('/', 'host_heartbeat', function(data) {
    $scope.host_heartbeat = data;
    $scope.update_loadavg(data.loadavg);
  })

  socket.on('/', 'untrack_server', function(server_name) {
    if (server_name == $scope.current)
      $scope.change_page('dashboard');
  })

  $scope.loadavg = [];
  $scope.loadavg_options = {
      element: $("#load_averages"),
      fallback_xaxis_max: 1,
      series: { 
        lines: {
          show: true,
          fill: .5
        },
        shadowSize: 0 
      },
      yaxis: { min: 0, max: 1 },
      xaxis: { min: 0, max: 30, show: false },
      grid: { borderWidth: 0 }
    };

  /* other functions */

  $scope.server_command = function(cmd) {
    socket.emit($scope.current, 'command', {command: cmd});
  }

  $scope.console_input = function() {
    socket.emit($scope.current, 'command', {command: 'stuff', msg: $scope.user_input });
    $scope.user_input = '';
  }

  $scope.change_sp = function() {
    socket.emit($scope.current, 'command', { command: 'modify_sp', 
                                             property: this.property,
                                             new_value: this.new_value });
  }

  $scope.create_server = function() {
    var serverform = $scope.serverform;
    var server_name = serverform['server_name'];
    var hyphenated = {};

    delete serverform['server_name'];

    for (var prop in serverform) 
      if (serverform.hasOwnProperty(prop)) 
        hyphenated[prop.split("_").join("-")] = serverform[prop]; //replace _ with -

    socket.emit('/', 'command', {
      'command': 'create',
      'server_name': server_name,
      'properties': hyphenated
    });

    $scope.change_page('dashboard', server_name);
  }

  $scope.update_loadavg = function(new_datapoint) {
    $scope.loadavg.push(new_datapoint);

    while ($scope.loadavg.length > $scope.loadavg_options.xaxis.max)
      $scope.loadavg.splice(0,1);

    function get_enumerated_values(column) {
      var res = [];
      for (var i = 0; i < $scope.loadavg.length; ++i)
        res.push([i, $scope.loadavg[i][column]])
      return res;
    }

    var dataset = [
      { label: "fifteen", data: get_enumerated_values(2), color: "#0077FF" },
      { label: "five", data: get_enumerated_values(1), color: "#ED7B00" },
      { label: "one", data: get_enumerated_values(0), color: "#E8E800" }
    ];

    $scope.loadavg_options.yaxis.max = Math.max(
      Math.max.apply(Math,dataset[0].data),
      Math.max.apply(Math,dataset[1].data),
      Math.max.apply(Math,dataset[2].data)) || $scope.loadavg_options.fallback_xaxis_max;

    $.plot($scope.loadavg_options.element, dataset, $scope.loadavg_options).draw();
  }

  $scope.change_page = function(page, server_name) {
    if (server_name)
      $scope.current = server_name;

    $scope.page = page;
  }

}]);

/* factories */

app.factory("Servers", ['socket', function(socket) {
  var self = this;

  var server_model = function(server_name) {
    var me = this;
    me.server_name = server_name;
    me.channel = socket;
    me.page_data = {};
    me.live_logs = {};
    me.notices = {};

    me.channel.on(server_name, 'heartbeat', function(data) {
      me.heartbeat = data.payload;
    })

    me.channel.on(server_name, 'page_data', function(data) {
      me.page_data[data.page] = data.payload;
    })

    me.channel.on(server_name, 'tail_data', function(data) {
      try {
        me.live_logs[data.filepath].push(data.payload);
      } catch (e) {
        me.live_logs[data.filepath] = [data.payload];
      }
    })

    me.channel.on(server_name, 'server_ack', function(data) {
      console.log('server_ack', data);
      me.notices[data.uuid] = data;
    })

    me.channel.on(server_name, 'server_fin', function(data) {
      if ('property' in data) {
        switch (data.property) {
          case 'server.properties':
            me['sp'] = data.payload;
            break;
          default:
            break;
        }
      } else if ('command' in data) {
        console.log('server_fin', data)
        me.notices[data.uuid] = data;
        console.log(me.notices)
        /*me.channel.emit(server_name, 'page_data', 'glance');*/
      }
    })

    me.channel.emit(server_name, 'property', {property: 'server.properties'});
    me.channel.emit(server_name, 'page_data', 'glance');
    me.channel.emit(server_name, 'watch', 'logs/latest.log');

    return me;
  }

  socket.on('/', 'server_list', function(servers) {
    angular.forEach(servers, function(server_name) {
      this[server_name] = new server_model(server_name);
    }, self)
  })

  socket.on('/', 'track_server', function(server_name) {
    self[server_name] = new server_model(server_name);
  })

  socket.on('/', 'untrack_server', function(server_name) {
    delete self[server_name];
  })

  return self;
}])

app.factory('socket', function ($rootScope) {
  //http://briantford.com/blog/angular-socket-io
  var sockets = {};
  return {
    on: function (server_name, eventName, callback) {
      if (!(server_name in sockets)) {
        if (server_name == '/')
          sockets[server_name] = io(connect_string);
        else
          sockets[server_name] = io(connect_string + server_name);
      }

      sockets[server_name].on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(sockets[server_name], args);
        });
      });
    },
    emit: function (server_name, eventName, data, callback) {
      if (!(server_name in sockets)) {
        if (server_name == '/')
          sockets[server_name] = io(connect_string);
        else
          sockets[server_name] = io(connect_string + server_name);
      }

      sockets[server_name].emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(sockets[server_name], args);
          }
        });
      })
    }
  };
})

/* prototypes */

String.prototype.format = String.prototype.f = function() {
  var s = this,
      i = arguments.length;

  while (i--) { s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);}
  return s;
};