/*
 * Swipe 2.1
 *
 * Chileung
 *
 * Inspired By Brad Birdsall
 *
 * Copyright 2015, MIT License
 *
 */

'use strict';

function Swipe(container, options) {
  if (!container) return;

  // 包装器元素
  var element = container.children[0];

  // 滑动对象数组
  var slides;

  // 记录每个滑动对象位置的数组
  var slidePos;

  // 滑动对象大小
  var width;
  var height;

  // 滑动对象个数
  var length;

  // timer的引用
  var interval;

  // 设置一些用于触屏事件的对象
  var start = {};
  var delta = {};

  // 是否正在进行有效的滑动
  var isValidScrolling;

  // 配置信息
  options = options || {};

  // 指向当前对象的索引
  var index = parseInt(options.startSlide, 10) || 0;

  // 滑动速度值（毫秒）
  var speed = options.speed || 300;

  // 滑动方向（支持水平、垂直）
  var direction = options.direction || 'horizontal';

  // 滑动单位（根据方向来决定滑动单位）
  var unit;

  // 是否开启循环
  options.continuous = options.continuous !== undefined ? options.continuous : true;
  // temp
  options.continuous = false;

  // 设置自动开始的延迟毫秒数
  var delay = options.auto || 0;

  // 设置事件处理函数
  var events = {
    // 事件分派入口
    handleEvent: function (event) {
      switch (event.type) {
        case 'touchstart':
          this.start(event);
          break;
        case 'touchmove':
          this.move(event);
          break;
        case 'touchend':
          this.end(event);
          break;
        case 'webkitTransitionEnd':
        case 'msTransitionEnd':
        case 'oTransitionEnd':
        case 'otransitionend':
        case 'transitionend':
          this.transitionEnd(event);
          break;
        case 'resize':
          setup();
          break;
      }

      if (options.stopPropagation) event.stopPropagation();
    },
    start: function (event) {
      // 获取触摸事件对象
      var touches = event.touches[0];

      // 计算开始值
      start = {
        // 获取初始触摸坐标
        x: touches.pageX,
        y: touches.pageY,

        // 记录时间，用于计算触摸耗时，以便确定 touchend 时的动作
        time: +new Date()
      };

      // 重置 delta 并且结束计算
      delta = {};

      isValidScrolling = undefined;

      // 监听 touchmove 和 touchend 事件
      element.addEventListener('touchmove', this, false);
      element.addEventListener('touchend', this, false);
    },
    move: function (event) {
      // 保证滑动时只存在一个触摸点并且没有捏~
      if (event.touches.length > 1 || event.scale && event.scale !== 1) return;

      if (options.disableScroll) event.preventDefault();

      var touches = event.touches[0];

      // 计算 x 轴、y 轴的变化量
      delta = {
        x: touches.pageX - start.x,
        y: touches.pageY - start.y
      };

      if (typeof isValidScrolling === 'undefined') {
        isValidScrolling = !!(Math.abs(delta.x) > Math.abs(delta.y)); // jshint ignore:line

        if (direction === 'vertical') {
          isValidScrolling = !isValidScrolling;
        }
      }

      if (isValidScrolling) {
        // prevent native scrolling
        event.preventDefault();

        // stop slideshow
        stop();

        // increase resistance if first or last slide
        // if (options.continuous) { // we don't add resistance at the end
        // translate(circle(index - 1), delta.x + slidePos[circle(index - 1)], 0);
        // translate(index, delta.x + slidePos[index], 0);
        // translate(circle(index + 1), delta.x + slidePos[circle(index + 1)], 0);
        // } else {

        // 计算阻碍级别
        if (direction === 'horizontal') {
          // 当当前滑动对象是第一个对象且向左滑动；或是最后一个对象且向右滑动，需要计算阻碍力，否则没有阻碍力
          delta.x =
            delta.x /
            ((!index && delta.x > 0 || index === slides.length - 1 && delta.x < 0) ? (Math.abs(delta.x) / width + 1) : 1);
        } else if (direction === 'vertical') {
          // 当当前滑动对象是第一个对象且向上滑动；或是最后一个对象且向下滑动，需要计算阻碍力，否则没有阻碍力
          delta.y =
            delta.y /
            ((!index && delta.y > 0 || index === slides.length - 1 && delta.y < 0) ? (Math.abs(delta.y) / height + 1) : 1);
        }

        var dist = direction === 'horizontal' && delta.x || direction === 'vertical' && delta.y;

        // 移动三个滑动对象（当前、前一个、后一个）
        translate(index - 1, dist + slidePos[index - 1], 0);
        translate(index, dist + slidePos[index], 0);
        translate(index + 1, dist + slidePos[index + 1], 0);
        // }
      }
    },
    end: function () {
      // 计算滑动耗时
      var duration = +new Date() - start.time;

      // 判断当前滑动动作是否尝试滑动到前/后一个滑动对象
      // 判断是否满足以下任一条件：
      // 1. 滑动耗时是否小于250毫秒，并且滑动变化量大于20像素
      // 2. 滑动变化量是否大于大小的一半
      var isValidSlide;
      if (direction === 'vertical') {
        isValidSlide = Number(duration) < 250 && Math.abs(delta.y) > 20 || Math.abs(delta.y) > height / 2;
      } else if (direction === 'horizontal') {
        isValidSlide = Number(duration) < 250 && Math.abs(delta.x) > 20 || Math.abs(delta.x) > width / 2;
      }

      // 判断滑动动作是否尝试跨越首尾对象
      // 判断条件：（满足其一）
      // if first slide and slide amt is greater than 0
      // or if last slide and slide amt is less than 0
      var isPastBounds;
      if (direction === 'vertical') {
        isPastBounds = !index && delta.y > 0 || index === slides.length - 1 && delta.y < 0;
      } else if (direction === 'horizontal') {
        isPastBounds = !index && delta.x > 0 || index === slides.length - 1 && delta.x < 0;
      }

      // if (options.continuous) isPastBounds = false;

      if (isValidScrolling) {
        if (isValidSlide && !isPastBounds) {
          // 如果是有效的滑动，并且不是经过首尾对象
          // determine direction of swipe (true:right, false:left)
          // 判断当前滑动操作的方向
          var dir;
          if (direction === 'vertical') {
            dir = delta.y < 0;
          } else if (direction === 'horizontal') {
            dir = delta.x < 0;
          }

          if (dir) {
            // if (options.continuous) { // we need to get the next in this direction in place
            // move(circle(index - 1), -width, 0);
            // move(circle(index + 2), width, 0);
            // } else {
            move(index - 1, -unit, 0);
            // }

            move(index, slidePos[index] - unit, speed);
            move(circle(index + 1), slidePos[circle(index + 1)] - unit, speed);
            index = circle(index + 1);
          } else {
            // if (options.continuous) { // we need to get the next in this direction in place
            // move(circle(index + 1), width, 0);
            // move(circle(index - 2), -width, 0);
            // } else {
            move(index + 1, unit, 0);
            // }

            move(index, slidePos[index] + unit, speed);
            move(circle(index - 1), slidePos[circle(index - 1)] + unit, speed);
            index = circle(index - 1);
          }

          /* jshint expr: true */
          options.callback && options.callback(index, slides[index]);
        } else {
          // if (options.continuous) {
          // move(circle(index - 1), -width, speed);
          // move(index, 0, speed);
          // move(circle(index + 1), width, speed);
          // } else {

          // 如果不是有效的滑动，或者当前滑动动作尝试跨越首尾对象
          // 则将 index 返回显示位置，并重置其左右的滑动对象
          move(index - 1, -unit, speed);
          move(index, 0, speed);
          move(index + 1, unit, speed);
          // }
        }
      }

      // kill touchmove and touchend event listeners until touchstart called again
      element.removeEventListener('touchmove', events, false);
      element.removeEventListener('touchend', events, false);
    },
    // transition 完毕后的检查和回调
    transitionEnd: function (event) {
      // 确保当前的节点和 index 指向的节点一致
      if (parseInt(event.target.getAttribute('data-index'), 10) === index) {
        // 检测是否设置了自动运行
        if (delay) begin();

        /* jshint expr: true */
        options.transitionEnd && options.transitionEnd.call(event, index, slides[index]);
      }
    }
  };

  // 注册事件
  element.addEventListener('touchstart', events, false);
  element.addEventListener('webkitTransitionEnd', events, false);
  element.addEventListener('msTransitionEnd', events, false);
  element.addEventListener('oTransitionEnd', events, false);
  element.addEventListener('otransitionend', events, false);
  element.addEventListener('transitionend', events, false);
  window.addEventListener('resize', events, false);

  // 触发设置方法
  setup();

  // 如果设置了启动延时，则执行begin方法
  if (delay) begin();

  // 暴露 Swipe API
  return {
    setup: function () {
      setup();
    },
    slide: function (to, speed) {
      // cancel slideshow
      stop();

      slide(to, speed);
    },
    prev: function () {
      // cancel slideshow
      stop();

      prev();
    },
    next: function () {
      // cancel slideshow
      stop();

      next();
    },
    stop: function () {
      // cancel slideshow
      stop();
    },
    getPos: function () {
      // return current index position
      return index;
    },
    getNumSlides: function () {
      // return total number of slides
      return length;
    },
    kill: function () {
      // cancel slideshow
      stop();

      // reset slides
      var pos = slides.length;
      while (pos--) {
        var slide = slides[pos];
        slide.style.width = '';
        slide.style.height = '';

        translate(pos, 0, 0);
      }

      // remove current event listeners
      element.removeEventListener('touchstart', events, false);
      element.removeEventListener('webkitTransitionEnd', events, false);
      element.removeEventListener('msTransitionEnd', events, false);
      element.removeEventListener('oTransitionEnd', events, false);
      element.removeEventListener('otransitionend', events, false);
      element.removeEventListener('transitionend', events, false);
      window.removeEventListener('resize', events, false);
    }
  };

  // 初始化设置
  function setup() {
    // 获取所有滑动对象并缓存
    slides = element.children;
    length = slides.length;

    // 若只有一个滑动对象，则设循环为 false
    // if (slides.length < 2) options.continuous = false;

    // 对于只有两个滑动对象的特殊情况，作特殊处理
    // if (options.continuous && slides.length < 3) {
    // element.appendChild(slides[0].cloneNode(true));
    // element.appendChild(element.children[1].cloneNode(true));
    // slides = element.children;
    // }

    // 创建一个数组，用于保存每个滑动对象的当前位置
    slidePos = new Array(slides.length);

    // 计算每个滑动对象的大小
    width = container.getBoundingClientRect().width || container.offsetWidth;
    height = container.getBoundingClientRect().height || container.offsetHeight;

    // 根据方向决定单位长度
    unit = direction === 'vertical' ? height : width;

    // 对每个滑动对象，设置其大小、唯一标识，并移动到合适的位置
    var pos = slides.length;
    while (pos--) {
      var slide = slides[pos];

      slide.setAttribute('data-index', pos);
      slide.style.width = width + 'px';
      slide.style.height = height + 'px';

      // 比当前索引小的，移到左（上）边，比当前索引大的，移到右（下）边
      move(pos, index > pos ? -unit : (index < pos ? unit : 0), 0);
    }

    // reposition elements before and after index
    // if (options.continuous) {
    // move(circle(index - 1), -width, 0);
    // move(circle(index + 1), width, 0);
    // }

    container.style.visibility = 'visible';
  }

  // 上一页
  function prev() {
    // 只在允许循环或当前索引不为0的时候可以返回前一页
    if (options.continuous) slide(index - 1);
    else if (index) slide(index - 1);
  }

  // 下一页
  function next() {
    // 只在允许循环或当前索引小于最大滑动数时可以前进到下一页
    if (options.continuous) slide(index + 1);
    else if (index < slides.length - 1) slide(index + 1);
  }

  // 在循环中确认真实位置
  function circle(index) {
    // 返回 index 所指向的真实位置
    return (slides.length + (index % slides.length)) % slides.length;
  }

  // 滑动方法（核心）
  function slide(to, slideSpeed) {
    // 若要切换的滑动对象是当前滑动对象，则不执行任何操作
    if (index === to) return;

    // 计算滑动方向
    var dir = Math.abs(index - to) / (index - to); // 1: backward, -1: forward

    // get the actual position of the slide
    // if (options.continuous) {
    //   var natural_direction = direction;
    //   direction = -slidePos[circle(to)] / width;
    //   // if going forward but to < index, use to = slides.length + to
    //   // if going backward but to > index, use to = -slides.length + to
    //   if (direction !== natural_direction) to = -direction * slides.length + to;
    // }

    var diff = Math.abs(index - to) - 1;

    // 将所有在 index 和 to 之间的滑动对象都往计算出来的方向滑动
    while (diff--) move(circle((to > index ? to : index) - diff - 1), dir * unit, 0);

    to = circle(to);

    // 将 index 按指定速度，往计算出来的方向滑动
    move(index, dir * unit, slideSpeed || speed);
    // 将 to 按指定速度，往计算出来的方向滑动到当前显示范围
    move(to, 0, slideSpeed || speed);

    // if (options.continuous) move(circle(to - direction), -(width * direction), 0); // we need to get the next in place

    // 更新 index
    index = to;

    /* jshint expr: true */
    options.callback && options.callback(index, slides[index]);
  }

  // 移动滑动对象
  function move(index, dist, speed) {
    // 使用 translate 移动滑动对象
    translate(index, dist, speed);
    // 记录其位置
    if (index >= 0 && index < slidePos.length) {
      slidePos[index] = dist;
    }
  }

  // 通过 JS 执行 translate 并设置 duration
  function translate(index, dist, speed) {
    var slide = slides[index];
    var style = slide && slide.style;

    if (!style) return;

    style.webkitTransitionDuration =
      style.MozTransitionDuration =
      style.msTransitionDuration =
      style.OTransitionDuration =
      style.transitionDuration = speed + 'ms';

    var cmd =
      direction === 'horizontal' && 'translate(' + dist + 'px, 0px)' ||
      direction === 'vertical' && 'translate(0px, ' + dist + 'px)';

    style.webkitTransform = cmd + 'translateZ(0)';

    cmd =
      direction === 'horizontal' && 'translateX(' ||
      direction === 'vertical' && 'translateY(';

    style.msTransform =
      style.MozTransform =
      style.OTransform = cmd + dist + 'px)';
  }

  // 启动
  function begin() {
    // 如果设置了自动开始，则在 transitionEnd 事件中会继续执行 next，因此此处使用 setTimeout 即可 
    interval = setTimeout(next, delay);
  }

  // 停止
  function stop() {
    // 清空delay
    delay = 0;
    // 清空Timer
    clearTimeout(interval);
  }
}

// 适配 JQ
if (window.jQuery || window.Zepto) {
  (function ($) {
    $.fn.Swipe = function (params) {
      return this.each(function () {
        $(this).data('Swipe', new Swipe($(this)[0], params));
      });
    };
  })(window.jQuery || window.Zepto);
}