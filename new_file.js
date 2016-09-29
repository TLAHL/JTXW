/* 

*数组元素去重 

*/

if (typeof Array.prototype.distinct != "function") {
	Array.prototype.distinct = function() {
		this.sort();
		for (var i = 0; i < this.length - 1; i++) {
			if ($.isPlainObject(this[i]) && $.isPlainObject(this[i + 1])) {
				if (o2o(this[i], this[i + 1])) {
					this.splice(i, 1);
				}
			} else if ($.isArray(this[i]) && $.isArray(this[i + 1])) {
				if (a2a(this[i], this[i + 1])) {
					this.splice(i, 1);
				}
			} else if (this[i] === this[i + 1]) {
				this.splice(i, 1);
			}
		}
	}
}

/* 

*比较对象是否相同 

*/

function o2o(o1, o2) {
	if (!($.isPlainObject(o1) && $.isPlainObject(o2))) {
		return false;
	}
	var k1k2 = [],
		k1 = [],
		k2 = [];
	$.each(o1, function(k, v) {
		k1.push(k);
	});

	$.each(o2, function(k, v) {
		k2.push(k);
	});
	if (k1.length != k2.length) {
		return false;
	}
	k1k2 = k1;
	k1k2 = k1k2.concat(k2);
	k1k2.distinct();
	if (k1.length != k1k2.length || k2.length != k1k2.length) {
		return false;
	}
	var flag = true;
	$.each(k1k2, function(i, v) {
		var v1 = o1[v];
		var v2 = o2[v];
		if (typeof v1 != typeof v2) {
			flag = false;
		} else {
			if ($.isPlainObject(v1) && $.isPlainObject(v2)) { //recursion 
				flag = o2o(v1, v2);
				if (!flag) {
					return false;
				}
			} else if ($.isArray(v1) && $.isArray(v2)) {
				flag = a2a(v1, v2);
				if (!flag) {
					return false;
				}
			} else {
				if (v1 !== v2) {
					flag = false;
				}
			}
		}
	});
	return flag;
}

/* 

*比较数组是否完全相同 

*/
function a2a(a1, a2) {
	if (!($.isArray(a1) && $.isArray(a2))) {
		return false;
	}
	if (a1.length != a2.length) {
		return false;
	}
	a1.sort();
	a2.sort();
	for (var i = 0; i < a1.length; i++) {
		if (typeof a1[i] != typeof a2[i]) {
			return false;
		}
		if ($.isPlainObject(a1[i]) && $.isPlainObject(a2[i])) {
			var retVal = o2o(a1[i], a2[i]);
			if (!retVal) {
				return false;
			}
		} else if ($.isArray(a1[i]) && $.isArray(a2[i])) { //recursion 
			if (!a2a(a1[i], a2[i])) {
				return false;
			}
		} else if (a1[i] !== a2[i]) {
			return false;
		}
	}
	return true;
}