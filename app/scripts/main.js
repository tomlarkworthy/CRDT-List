'use strict';
var list1 = new CRDTList(new Firebase('https://crdtlist.firebaseIO.com/locked_list', new Firebase.Context()));
var list2 = new CRDTList(new Firebase('https://crdtlist.firebaseIO.com/locked_list', new Firebase.Context()));
var text1 = "";
var text2 = "";

list1.on('change', function(){
    text1 = list1.asArray().map(function(element){return element.value}).join("");
    $('#textarea1').val(text1);
});


list2.on('change', function(){
    text2 = list2.asArray().map(function(element){return element.value}).join("");
    $('#textarea2').val(text2);
});

$("#rebalance").on('click', function(){
    console.log("pre  rebalance", list1.asArray().map(function(e){return e.value;}));
    console.log("pre  rebalance", list1.asArray().map(function(e){return e.key;}));
    list1.rebalance();
    console.log("post rebalance", list1.asArray().map(function(e){return e.value;}));
    console.log("post rebalance", list1.asArray().map(function(e){return e.key;}));
});

$("#textarea1").on("change keyup paste", function() {
    var new_string = $(this).val();
    if(new_string == text1) {
        return; //check to prevent multiple simultaneous triggers
    }

    //console.log("Current position: " + $(this).caret('pos'));

    //first we calculated the required insets and deletes to change to new string
    var diff = JsDiff.diffChars(text1, new_string);
    //console.log("diff:", diff);

    //next we make a mapping between original indeces to element data
    var list_elements_cache = list1.asArray();
    //console.log("list_elements_cache", list_elements_cache);
    //now we step through the changes and update the list model
    var index = 0;
    for(var change_index=0;change_index<diff.length; change_index++ ){
        var change = diff[change_index];

        if(change.added){
            var key_before = list_elements_cache[index-1]?list_elements_cache[index-1].key:null;
            var key_after  = list_elements_cache[index]?list_elements_cache[index].key:null;
            var character_inserts = change.value.split('');

            //console.log("index", index);
            //console.log("key_before", key_before);
            //console.log("character_inserts", character_inserts);

            for(var c_id=0; c_id < character_inserts.length; c_id++){
                //insert and bump key_before index
                key_before = list1.insertBetween(
                    key_before,
                    key_after,
                    character_inserts[c_id],
                    "list1").key
            }
        }else if(change.removed){
            var character_removes = change.value.split('');

            for(var c_id=0; c_id < character_removes.length; c_id++){
                var key = list_elements_cache[index + c_id].key;
                var dis = list_elements_cache[index + c_id].disambiguator;

                key_before = list1.remove(key, dis);
            }

        }else{
            index += change.value.length;
        }
    }

    console.log("post edit", list1.asArray().map(function(e){return e.value;}));
    console.log("post edit", list1.asArray().map(function(e){return e.key;}));


});

