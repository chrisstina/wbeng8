String.prototype.repeat = function (num) {
    return (num == 0) ? '' : new Array(parseInt(num) + 1).join(this);
};

String.prototype.pad = function (size, fill) {
    var s = this.toString();
    while (s.length < size) {
        s = fill + s;
    }
    return s;
};

String.prototype.splice = function(start, delCount, newSubStr) {
    return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
};

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};