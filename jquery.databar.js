/**
 * jquery.databar - jQuery plugin for Excel-style data bar.
 * https://github.com/ts-3156/databar
 * Released under the MIT license
 */
(function ($) {
  var ColorMaker = function(options) {
    var options = options || {};
    this.options = $.extend({}, options);

    this.color = (function (self) {
      var n = 0;
      var backgroundOpacity = (self.options.backgroundOpacity || 0.4);
      // solarized colors
      // http://ethanschoonover.com/solarized
      var colors = [
          'rgba(181, 137, 0, ' + backgroundOpacity + ')',   // '#b58900',
          'rgba(203, 75, 22, ' + backgroundOpacity + ')',   // '#cb4b16',
          'rgba(220, 50, 47, ' + backgroundOpacity + ')',   // '#dc322f',
          'rgba(211, 54, 130, ' + backgroundOpacity + ')',  // '#d33682',
          'rgba(108, 113, 196, ' + backgroundOpacity + ')', // '#6c71c4',
          'rgba(38, 139, 210, ' + backgroundOpacity + ')',  // '#268bd2',
          'rgba(42, 161, 152, ' + backgroundOpacity + ')',  // '#2aa198',
          'rgba(133, 153, 0, ' + backgroundOpacity + ')'    // '#859900'
      ];
      return function () {
        n++;
        if (n >= colors.length) {
          n = 0;
        }
        return colors[n];
      };
    })(this);
  };

  var throw_if_invalid_html = function($table){
    if ($table.find('thead').length == 0) {
      throw 'thead not found. please use thead, th, tbody, tr and td.';
    }
    if ($table.find('tbody').length == 0) {
      throw 'tbody not found. please use thead, th, tbody, tr and td.';
    }
    if ($table.find('tbody tr').length == 0) {
      throw 'tr not found. please use thead, th, tbody, tr and td.';
    }
    if ($table.find('tbody tr td').length == 0) {
      throw 'td not found. please use thead, th, tbody, tr and td.';
    }
  };

  var has_duplicate = function(arr){
    if(arr.length===0) return false;
    arr.sort();
    let prev = arr[0];
    for(let i=1; i<arr.length; i++){
        if(arr[i] === prev){
            return true
        } else {
            prev = arr[i];
        }
    }
    return false;

  };

  var get_all_column_groups = function(column_size, options){
    /*
    column_size: 7
    options['column_groups']: [[1,2],[4,6]]

    return: [[0],[1,2],[3],[4,6],[5]]

    ------

    column_size: 3
    options: Do not have 'column_groups'

    return: [[0],[1],[2]]

    ------

    column_size: 7
    options['column_groups']: [[1,2],[4,6]]
    options['ignore_columns']: [2,3]

    return: [[0],[1],[4,6],[5]]
     */
    let result;
    if(options.hasOwnProperty('column_groups')){
        let column_groups = options['column_groups'];
        let column_groups_flattened = [];

        for (let i= 0; i < column_groups.length; i++){
            for (let j=0; j<column_groups[i].length; j++){
                column_groups_flattened.push(column_groups[i][j]);
            }
        }
        if(has_duplicate(column_groups_flattened)){
            throw 'column_groups in options has duplicate columns';
        }
        result = column_groups;
        for(let i=0; i<column_size; i++){
            if(column_groups_flattened.indexOf(i) === -1){
                result.push([i]);
            }
        }
    } else {
        result = new Array(column_size);
        for (let i = 0; i < column_size; i++){
            result[i] = [i];
        }
    }

    if(options.hasOwnProperty('ignore_columns')){
        let ignore_columns = options['ignore_columns'];
        for(let i=0; i<result.length; i++){
            let idx_to_remove = [];
            for(let j=0; j<ignore_columns.length; j++){
                let idx = result[i].indexOf(ignore_columns[j]);
                if(idx > -1){
                    idx_to_remove.push(idx);
                }
            }
            idx_to_remove.sort(function(a,b){return b-a});
            for(let k=0; k<idx_to_remove.length; k++){
                result[i].splice(idx_to_remove[k], 1);
            }
        }
        
        let idx_to_remove = [];
        for(let i=0; i<result.length; i++){
            if(result[i].length===0){
                idx_to_remove.push(i);
            }
        }
        idx_to_remove.sort(function(a,b){return b-a});
        for(let i=0; i<idx_to_remove.length; i++){
            result.splice(idx_to_remove[i], 1);
        }
        return result;
    } else {
        return result
    }
  };

  $.fn.databar = function (options) {
    var options = options || {};
    var colorMaker = new ColorMaker(options);

    options.css = $.extend({
      textAlign: 'right'
    }, options.css);


    var $table = $(this);
    throw_if_invalid_html($table);

    var column_size = $table.find('tbody tr').first().find('td').length;
    var all_column_groups = get_all_column_groups(column_size, options);

    for (var j = 0; j < all_column_groups.length; j++) {
      var td_selector_groups = all_column_groups[j].map(function(x){
        return 'tbody tr > :nth-child(' + (x + 1) + ')';
      });
      var td_selector = td_selector_groups.join(',');
      var $vertical_tds = $table.find(td_selector);
      var numbers = $vertical_tds.map(function (i) {
        var text = $(this).text();

        var stripped = text.replace(/[\s,%$円€\\]/g, '');
        if ($.isNumeric(stripped)) {
          return parseFloat(stripped);
        } else {
          return false;
        }
      });

      (function ($tds, options) {
        var metrics = {};
        metrics['fullRangeMin'] = Math.min(0, Math.min.apply(null, numbers));
        metrics['fullRange'] = Math.max.apply(null, numbers) - metrics['fullRangeMin'];
        metrics['zero'] = (0 - metrics['fullRangeMin']) / metrics['fullRange'];
        var color = colorMaker.color();

        $tds.each(function (i) {
          var $td = $(this);

          if (numbers[i] === false) {
            return true;
          }
          if ($td.hasClass('databar-ignore')) {
            return true;
          }


          var barLeft;
          var barWidthNum = Math.abs(numbers[i]) / metrics['fullRange'];
          var barWidth = (100 * barWidthNum) + '%';
          var barColor;

          if(numbers[i] >= 0){
              barColor = color;
              barLeft = (100 * metrics['zero']) + '%';
          } else {
              barLeft = (100 * (metrics['zero'] - barWidthNum)) + '%';
              barColor = 'rgba(255, 0, 0, 0.4)';
          }

          var $bar = $('<span />')
            .css($.extend({
              'position': 'absolute',
              'top': 0,
              'left': barLeft,
              'right': 0,
              'zIndex': 0,
              'display': 'block',
              'height': '100%',
              'width': barWidth,
              'backgroundColor': barColor
            }, options.css));
          $td.prepend($bar);

          $td.wrapInner($('<div />')
            .css({
              'position': 'relative',
              'min-height': '1.5em' // float bug fix
          }));
        });
      })($vertical_tds, options);
    }

    return this;
  }
}(jQuery));
