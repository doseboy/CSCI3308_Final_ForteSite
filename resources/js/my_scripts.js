function viewRegType(id, toggle) {
    console.log(id)
    console.log(toggle)
    if(toggle == 0) {
        document.getElementById(id).style.height = 0;
        document.getElementById(id).style.visibility = "hidden";
    } else if(toggle == 1) {
        document.getElementById(id).style.height = "auto";
        document.getElementById(id).style.visibility = "visible";
    }
}
