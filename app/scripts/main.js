'use strict';

var list = new CRDTList(new Firebase('https://crdtlist.firebaseIO.com/list'));


list.insert(null, null, "first");

list.on('value', function(){
    $('#textarea').val(list.asArray().join(""));
});


var old_string = "";
$("#textarea").on("change keyup paste", function() {
    var new_string = $(this).val();
    if(new_string == old_string) {
        return; //check to prevent multiple simultaneous triggers
    }
    old_string = new_string;

    //action to be performed on textarea changed
    console.log("change of text area", new_string);
});