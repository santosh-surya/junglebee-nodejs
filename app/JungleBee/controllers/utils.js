module.exports = {
    getObjectHasKeyValues: function(key, value, arrObject){
        var ret = new Array();
        arrObject.forEach(function(obj){
            if (obj[key] == value)
                ret.push(obj);
        });
        return ret;
    }
}