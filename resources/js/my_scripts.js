function viewRegType(id, toggle) {
    if(toggle == 0) {
        document.getElementByID(id).style.height = 0;
        document.getElementByID(id).style.visibility = "hidden";
    } else if(toggle == 1) {
        document.getElementByID(id).style.height = "auto";
        document.getElementByID(id).style.visibility = "visible";
    }
}
