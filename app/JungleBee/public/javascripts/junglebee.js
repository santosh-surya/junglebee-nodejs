window.setTimeout(function() {
    $(".autohide").slideUp(500, function(){
        $(this).remove(); 
    });
}, 5000);