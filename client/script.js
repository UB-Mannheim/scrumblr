var cards = {};
var totalcolumns = 0;
var columns = [];
var currentTheme = "bigcards";
var boardInitialized = false;
var keyTrap = null;
var ctrlPressed = false;

var baseurl = location.pathname.substring(0, location.pathname.lastIndexOf('/'));
var socket = io.connect({path: baseurl + "/socket.io"});

//an action has happened, send it to the server
function sendAction(a, d) {
    // console.log('--> ' + a);

    var message = {
        action: a,
        data: d
    };

    socket.json.send(message);
}

socket.on('connect', function() {
    //console.log('successful socket.io connect');

    //let the final part of the path be the room name
    var room = location.pathname.substring(location.pathname.lastIndexOf('/'));

    //immediately join the room which will trigger the initializations
    sendAction('joinRoom', room);
});

socket.on('disconnect', function() {
    blockUI("Server disconnected. Refresh page to try and reconnect...");
    //$('.blockOverlay').click($.unblockUI);
});

socket.on('message', function(data) {
    getMessage(data);
});

function unblockUI() {
    $.unblockUI({fadeOut: 50});
}

function blockUI(message) {
    message = message || 'Waiting...';

    $.blockUI({
        message: message,

        css: {
            border: 'none',
            padding: '15px',
            backgroundColor: '#000',
            '-webkit-border-radius': '10px',
            '-moz-border-radius': '10px',
            opacity: 0.5,
            color: '#fff',
            fontSize: '20px'
        },

        fadeOut: 0,
        fadeIn: 10
    });
}

//respond to an action event
function getMessage(m) {
    var message = m;
    var action = message.action;
    var data = message.data;

    // alert('action received: ' + action)

    switch (action) {
        case 'roomAccept':
            //okay we're accepted, then request initialization
            //(this is a bit of unnessary back and forth but that's okay for now)
            sendAction('initializeMe', null);
            break;

        case 'roomDeny':
            //this doesn't happen yet
            break;

        case 'moveCard':
            moveCard($("#" + data.id), data.position);
            break;

        case 'initCards':
            initCards(data);
            break;

        case 'createCard':
            drawNewCard(data.id, data.text, data.x, data.y, data.rot, data.colour, null, data.type);
            break;

        case 'deleteCard':
            $("#" + data.id).fadeOut(500,
                function() {
                    $(this).remove();
                }
            );
            break;

        case 'editCard':
            $("#" + data.id).children('.content:first').attr('data-text', data.value);
            $("#" + data.id).children('.content:first').html(marked(data.value));
            break;

        case 'pulsateCard':
            pulsateCard(data.id);
            break;

        case 'initColumns':
            initColumns(data);
            break;

        case 'updateColumns':
            initColumns(data);
            break;

        case 'initRows':
            initRows(data);
            break;

        case 'createRow':
            drawNewRow(data.id, data.text, data.y)
            break;

        case 'deleteRow':
            $("#" + data.id).fadeOut(500,
                function() {
                    $(this).remove();
                }
            )
            break;

        case 'updateRowPos':
            row = $("#" + data.id)
            if (row != null) {
                row.css('top', data.y + 'px');
            }
            break;

        case 'updateRowText':
            $("#" + data.id).children('.row-text').text(data.text);
            break;

        case 'moveEraser':
            moveEraser($("#" + data.id), data.x);
            break;

        case 'moveMarker':
            moveMarker($("#" + data.id), data.x);
            break;

        case 'changeTheme':
            changeThemeTo(data);
            break;

        case 'join-announce':
            displayUserJoined(data.sid, data.user_name);
            break;

        case 'leave-announce':
            displayUserLeft(data.sid);
            break;

        case 'initialUsers':
            displayInitialUsers(data);
            break;

        case 'nameChangeAnnounce':
            updateName(message.data.sid, message.data.user_name);
            break;

        case 'addSticker':
            addSticker(message.data.cardId, message.data.stickerId);
            break;

        case 'setBoardSize':
            resizeBoard(message.data);
            adjustRows(message.data.width);
            adjustEraserAndMarker(message.data.height);
            break;

        default:
            //unknown message
            alert('unknown action: ' + JSON.stringify(message));
            break;
    }
}

$(document).bind('keyup', function(event) {
    keyTrap = event.which;

    if (keyTrap == 17) { // ctrl
        ctrlPressed = false;
     }
});

$(document).bind('keydown', function(event) {
    keyTrap = event.which;

    if (keyTrap == 17) { // ctrl
        ctrlPressed = true;
    }
});

function drawNewCard(id, text, x, y, rot, colour, sticker, type) {
	var img_src = null;
	var style_content = null;

	if (!type || type == 1) {
	    img_src = colour + "-card.png";
	    style_content = "";
	    style_card_icon = "";
	    style_filler = "";
	} else if (type == 2) {
	    img_src = colour + "-card-pi.png";
	    style_content = " content-pi";
	    style_card_icon = " card-icon-pi";
	    style_filler = " filler-pi";
	}

    var h = '<div id="' + id + '" class="card ' + colour +
        ' draggable" style="-webkit-transform:rotate(' + rot +
        'deg);\
	">\
	<img src="images/icons/token/Xion.png" class="card-icon' + style_card_icon + ' delete-card-icon" />\
	<img class="card-image" src="images/' + img_src + '">\
	<div id="content:' + id + '" class="content' + style_content + ' stickertarget droppable" data-text="">' +
        marked(text) + '</div><span class="filler' + style_filler + '"></span></div>';

    var card = $(h);

    card.appendTo('#board');
    $("#" + id).children('.content:first').attr('data-text', text);

    card.draggable({
        snap: false,
        snapTolerance: 5,
        containment: [0, 0, 2000, 2000],
        stack: ".card",
        start: function(event, ui) {
            keyTrap = null;
        },
        drag: function(event, ui) {
            if (keyTrap == 27) {
                ui.helper.css(ui.originalPosition);
                return false;
            }
        },
		handle: "div.content"
    });

    // After a drag
    card.bind("dragstop", function(event, ui) {
        if (keyTrap == 27) {
            keyTrap = null;
            return;
        }

        var data = {
            id: this.id,
            position: ui.position,
            oldposition: ui.originalPosition,
        };

        sendAction('moveCard', data);
    });

    card.children(".droppable").droppable({
        accept: '.sticker',
        drop: function(event, ui) {
            var stickerId = ui.draggable.attr("id");
            var cardId = $(this).parent().attr('id');

            addSticker(cardId, stickerId);

            var data = {
                cardId: cardId,
                stickerId: stickerId
            };
            sendAction('addSticker', data);

            //remove hover state to everything on the board to prevent
            //a jquery bug where it gets left around
            $('.card-hover-draggable').removeClass('card-hover-draggable');
        },
        hoverClass: 'card-hover-draggable'
    });

    var speed = Math.floor(Math.random() * 1000);
    var startPosition = $("#create-card").position();

    card.css('top', startPosition.top - card.height() * 0.5);
    card.css('left', startPosition.left - card.width() * 0.5);

    card.animate({
        left: x + "px",
        top: y + "px"
    }, speed);

    card.hover(
        function() {
            $(this).addClass('hover');
            $(this).children('.card-icon').fadeIn(10);
        },
        function() {
            $(this).removeClass('hover');
            $(this).children('.card-icon').fadeOut(150);
        }
    );

    card.children('.card-icon').hover(
        function() {
            $(this).addClass('card-icon-hover');
        },
        function() {
            $(this).removeClass('card-icon-hover');
        }
    );

    card.children('.delete-card-icon').click(
        function() {
            $("#" + id).remove();
            //notify server of delete
            sendAction('deleteCard', {
                id: id
            });
        }
    );

    card.children('.content').editable(function(value, settings) {
        $("#" + id).children('.content:first').attr('data-text', value);
        onCardChange(id, value);
        return (marked(value));
    }, {
        type: 'textarea',
        data: function() {
            return $("#" + id).children('.content:first').attr('data-text');
        },
        submit: 'OK',
        style: 'inherit',
        cssclass: 'card-edit-form',
        placeholder: 'Double click to edit...',
        onblur: 'submit',
        event: 'dblclick'
    });

    card.click(
        function() {
            if (!ctrlPressed) {
                return;
            }

            var data = {
                id: this.id
            };

            sendAction('pulsateCard', data);
            pulsateCard(this.id);
        }
    );

    //add applicable sticker
    if (sticker !== null)
        addSticker(id, sticker);
}

function onCardChange(id, text) {
    sendAction('editCard', {
        id: id,
        value: text
    });
}

function moveCard(card, position) {
    card.animate({
        left: position.left + "px",
        top: position.top + "px"
    }, 500);
}

function moveEraser(eraser, x) {
    eraser.animate({
        left: x + "px",
        top: eraser.position.top + "px"
    }, 500);
}

function moveMarker(marker, x) {
    marker.animate({
        left: x + "px",
        top: marker.position.top + "px"
    }, 500);
}

function adjustEraserAndMarker(boardHeight) {
    h = boardHeight == null ? $('#board').height() : boardHeight;

    eraser = $('#eraser');
    eraser.css('top', (h - eraser.height()) + 'px');

    marker = $('#marker');
    marker.css('top', (h - marker.height()) + 'px');
}

function addSticker(cardId, stickerId) {
    stickerContainer = $('#' + cardId + ' .filler');

    if (stickerId === "nosticker") {
        stickerContainer.html("");
        return;
    }

    if (Array.isArray(stickerId)) {
        for (var i in stickerId) {
            stickerContainer.prepend('<img src="images/stickers/' + stickerId[i] +
                '.png">');
        }
    } else {
        if (stickerContainer.html().indexOf(stickerId) < 0)
            stickerContainer.prepend('<img src="images/stickers/' + stickerId +
                '.png">');
    }
}

//----------------------------------
// cards
//----------------------------------
function createCard(id, text, x, y, rot, colour, type) {
    drawNewCard(id, text, x, y, rot, colour, null, type);

    var action = "createCard";
    var data = {
        id: id,
        text: text,
        x: x,
        y: y,
        rot: rot,
        colour: colour,
        type: type
    };

    sendAction(action, data);
}

function randomCardColour() {
    var colours = ['yellow', 'green', 'blue', 'white', 'orange', 'purple', 'red'];
    var i = Math.floor(Math.random() * colours.length);

    return colours[i];
}

function createCardAtRandomPos(color, type) {
    var rotation = Math.random() * 10 - 5; //add a bit of random rotation (+/- 10deg)
    var id = Math.round(Math.random() * 99999999); //is this big enough to assure uniqueness?
    var offsetX = Math.round(Math.random() * 50)
    var offsetY = Math.round(Math.random() * 20)

    createCard(
        'card' + id,
        '',
        60 + offsetX,
        $('div.board-outline').height() + 30 + offsetY,
        rotation,
        color,
        type);
}

function createCardAtDlgPos(color, type) {
    var rotation = Math.random() * 10 - 5; //add a bit of random rotation (+/- 10deg)
    var id = Math.round(Math.random() * 99999999); //is this big enough to assure uniqueness?

    var dlg = $('#buttons-dialog');

    createCard(
        'card' + id,
        '',
        dlg.position().left + 60,
        dlg.position().top,
        rotation,
        color,
        type);

    dlg.css('visibility', 'hidden');
}

function initCards(cardArray) {
    //first delete any cards that exist
    $('.card').remove();

    cards = cardArray;

    for (var i in cardArray) {
        card = cardArray[i];

        drawNewCard(
            card.id,
            card.text,
            card.x,
            card.y,
            card.rot,
            card.colour,
            card.sticker,
            card.type
        );
    }

    boardInitialized = true;
    unblockUI();
}

function pulsateCard(id) {
    $("#" + id).effect("pulsate", { times: 3 }, 2000);
}

//----------------------------------
// COLUMNS
//----------------------------------

function drawNewColumn(columnName) {
    var cls = "col";
    if (totalcolumns === 0) {
        cls = "col first";
    }

    $('#icon-col').before('<td class="' + cls +
        '" width="10%" style="display:none"><h2 id="col-' + (totalcolumns + 1) +
        '" class="editable">' + columnName + '</h2></td>');

    $('.editable').editable(function(value, settings) {
        onColumnChange(this.id, value);
        return (value);
    }, {
        style: 'inherit',
        cssclass: 'card-edit-form',
        type: 'textarea',
        placeholder: 'New',
        onblur: 'submit',
        width: '',
        height: '',
        xindicator: '<img src="images/ajax-loader.gif">',
        event: 'dblclick', //event: 'mouseover'
    });

    $('.col:last').fadeIn(1500);

    totalcolumns++;
}

function onColumnChange(id, text) {
    var names = Array();

    //Get the names of all the columns right from the DOM
    $('.col').each(function() {
        //get ID of current column we are traversing over
        var thisID = $(this).children("h2").attr('id');

        if (id == thisID) {
            names.push(text);
        } else {
            names.push($(this).text());
        }
    });

    updateColumns(names);
}

function displayRemoveColumn() {
    if (totalcolumns <= 0) return false;

    $('.col:last').fadeOut(150,
        function() {
            $(this).remove();
        }
    );

    totalcolumns--;
}

function createColumn(name) {
    if (totalcolumns >= 8) {
        return false;
    }

    drawNewColumn(name);
    columns.push(name);

    var action = "updateColumns";
    var data = columns;

    sendAction(action, data);
}

function deleteColumn() {
    if (totalcolumns <= 0) {
        return false;
    }

    displayRemoveColumn();
    columns.pop();

    var action = "updateColumns";
    var data = columns;

    sendAction(action, data);
}

function updateColumns(c) {
    columns = c;

    var action = "updateColumns";
    var data = columns;

    sendAction(action, data);
}

function deleteColumns(next) {
    //delete all existing columns:
    $('.col').fadeOut('slow', next());
}

//----------------------------------
// ROWS
//----------------------------------

function drawNewRow(id, text, y) {
    var h = '<div id="' + id + '" class="draggable row-line">' +
    '<span id="row-text-' + id + '" class="editable row-text" style="padding-left: 25px;">' + text + '</span>' +
	'<img src="images/icons/token/Xion.png" class="row-icon" />' +
	'</div>'

    var row = $(h);
    w = $('#board').width()
    row.appendTo('#board');
    row.css('width', w + 'px');
    row.css('top', y + 'px');
    row.css('left', 0 + 'px');

    row.draggable(
        {
           axis: "y",
           containment: "#board",
           stop: function(event, ui) {
               var newY = ui.position.top;
               updateRowPos(id, newY);
           }
        }
    )

    row.children('.editable').editable(function(value, settings) {
        updateRowText(id, value);
        return (value);
    }, {
        type: 'textarea',
        style: 'inherit',
        cssclass: 'card-edit-form',
        placeholder: 'Double Click to Edit.',
        width: '200px',
        height: '',
        onblur: 'submit',
        event: 'dblclick',
    });

    row.hover(
        function() {
            $(this).addClass('hover');
            $(this).children('.row-icon').fadeIn(10);
        },
        function() {
            $(this).removeClass('hover');
            $(this).children('.row-icon').fadeOut(150);
        }
    );

    row.children('.row-icon').hover(
        function() {
            $(this).addClass('row-icon-hover');
        },
        function() {
            $(this).removeClass('row-icon-hover');
        }
    );

    row.children('.row-icon').click(
        function() {
            if (confirm('Do you really want to delete the row?')) {
                deleteRow(id);
                $("#" + id).remove();
            }
        }
    );
}

function createNewRow() {
    var id = 'row' + Math.round(Math.random() * 99999999);
    createRow(id, 'Sample text', 200);
}

function createRow(id, text, y) {
    drawNewRow(id, text, y);

    var action = "createRow";
    var data = {
        id: id,
        text: text,
        y: y
    };

    sendAction(action, data);
}

function deleteRow(id) {
    var action = "deleteRow";
    var data = {
        id: id
    };

    sendAction(action, data);
}

function adjustRows(newWidth) {
    w = newWidth == null ? $('#board').width() : newWidth;

    $('.row-line').each(function() {
        $(this).css('width', w + 'px');
    });
}

function updateRowText(id, text) {
    var action = "updateRowText";
    var data = {
        id: id,
        text: text,
    };

    sendAction(action, data);
}

function updateRowPos(id, y) {
    var action = "updateRowPos";
    var data = {
        id: id,
        y: y
    };

    sendAction(action, data);
}

function initColumns(columnArray) {
    totalcolumns = 0;
    columns = columnArray;

    $('.col').remove();

    for (var i in columnArray) {
        column = columnArray[i];
        drawNewColumn(column);
    }
}

function initRows(rowArray) {
    $('.row-line').remove();

    for (var i in rowArray) {
        row = rowArray[i];
        drawNewRow(row.id, row.text, row.y);
    }

    adjustRows(null);
}

function changeThemeTo(theme) {
    currentTheme = theme;
    $("link[title=cardsize]").attr("href", "css/" + theme + ".css");
}

//////////////////////////////////////////////////////////
////////// NAMES STUFF ///////////////////////////////////
//////////////////////////////////////////////////////////


function setCookie(c_name, value, exdays) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value = escape(value) + ((exdays === null) ? "" : "; expires=" + exdate.toUTCString());
    document.cookie = c_name + "=" + c_value;
}

function getCookie(c_name) {
    var i, x, y, ARRcookies = document.cookie.split(";");
    for (i = 0; i < ARRcookies.length; i++) {
        x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
        y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
        x = x.replace(/^\s+|\s+$/g, "");
        if (x == c_name) {
            return unescape(y);
        }
    }
}

function setName(name) {
    sendAction('setUserName', name);
    setCookie('scrumscrum-username', name, 365);
}

function displayInitialUsers(users) {
    for (var i in users) {
        displayUserJoined(users[i].sid, users[i].user_name);
    }
}

function displayUserJoined(sid, user_name) {
    name = '';
    if (user_name)
        name = user_name;
    else
        name = sid.substring(0, 5);

    $('#names-ul').append('<li id="user-' + sid + '">' + name + '</li>');
}

function displayUserLeft(sid) {
    name = '';
    if (name)
        name = user_name;
    else
        name = sid;

    var id = '#user-' + sid.toString();

    $('#names-ul').children(id).fadeOut(1000, function() {
        $(this).remove();
    });
}

function updateName(sid, name) {
    var id = '#user-' + sid.toString();

    $('#names-ul').children(id).text(name);
}

//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

function boardResizeHappened(event, ui) {
    var newsize = ui.size;

    sendAction('setBoardSize', newsize);
}

function resizeBoard(size) {
    $(".board-outline").animate({
        height: size.height,
        width: size.width
    });
}
//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

function calcCardOffset() {
    var offsets = {};
    $(".card").each(function() {
        var card = $(this);
        $(".col").each(function(i) {
            var col = $(this);
            if (col.offset().left + col.outerWidth() > card.offset().left +
                card.outerWidth() || i === $(".col").size() - 1) {
                offsets[card.attr('id')] = {
                    col: col,
                    x: ((card.offset().left - col.offset().left) / col.outerWidth())
                };
                return false;
            }
        });
    });
    return offsets;
}

//moves cards with a resize of the Board
//doSync is false if you don't want to synchronize
//with all the other users who are in this room
function adjustCard(offsets, doSync) {
    $(".card").each(function() {
        var card = $(this);
        var offset = offsets[this.id];
        if (offset) {
            var data = {
                id: this.id,
                position: {
                    left: offset.col.position().left + (offset.x * offset.col
                        .outerWidth()),
                    top: parseInt(card.css('top').slice(0, -2))
                },
                oldposition: {
                    left: parseInt(card.css('left').slice(0, -2)),
                    top: parseInt(card.css('top').slice(0, -2))
                }
            };
            if (!doSync) {
                card.css('left', data.position.left);
                card.css('top', data.position.top);
            } else {
                moveCard(card, data.position);
                sendAction('moveCard', data);
            }
        }
    });
}

//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

$(function() {
    if (boardInitialized === false)
        blockUI('<img src="images/ajax-loader.gif" width=43 height=11/>');

    $("#create-card")
        .click(function() {
            createCardAtRandomPos(randomCardColour(), 1)
        });

    $("#create-card-yellow")
        .click(function() {
            createCardAtRandomPos('yellow', 1)
        });

    $("#create-card-green")
        .click(function() {
            createCardAtRandomPos('green', 1)
        });

    $("#create-card-blue")
        .click(function() {
            createCardAtRandomPos('blue', 1)
        });

    $("#create-card-white")
        .click(function() {
            createCardAtRandomPos('white', 1)
        });

    $("#create-card-orange")
        .click(function() {
            createCardAtRandomPos('orange', 1)
        });

    $("#create-card-purple")
        .click(function() {
            createCardAtRandomPos('purple', 1)
        });

    $("#create-card-red")
        .click(function() {
            createCardAtRandomPos('red', 1)
        });

    $("#create-card-pi-white")
        .click(function() {
            createCardAtRandomPos('white', 2)
        });

    $("#create-card-pi-yellow")
        .click(function() {
            createCardAtRandomPos('yellow', 2)
        });

    $("#create-card-pi-green")
        .click(function() {
            createCardAtRandomPos('green', 2)
        });

    $("#create-card-pi-blue")
        .click(function() {
            createCardAtRandomPos('blue', 2)
        });

    $("#create-card-pi-orange")
        .click(function() {
            createCardAtRandomPos('orange', 2)
        });

    $("#create-card-pi-purple")
        .click(function() {
            createCardAtRandomPos('purple', 2)
        });

    $("#create-card-pi-red")
        .click(function() {
            createCardAtRandomPos('red', 2)
        });

    $("#create-card-yellow-dlg")
        .click(function() {
            createCardAtDlgPos('yellow', 1)
        });

    $("#create-card-red-dlg")
        .click(function() {
            createCardAtDlgPos('red', 1)
        });

    $("#create-card-green-dlg")
        .click(function() {
            createCardAtDlgPos('green', 1)
        });

    $("#create-card-blue-dlg")
        .click(function() {
            createCardAtDlgPos('blue', 1)
        });

    $("#create-card-white-dlg")
        .click(function() {
            createCardAtDlgPos('white', 1)
        });

    $("#create-card-orange-dlg")
        .click(function() {
            createCardAtDlgPos('orange', 1)
        });

    $("#create-card-purple-dlg")
        .click(function() {
            createCardAtDlgPos('purple', 1)
        });

    $("#create-card-pi-yellow-dlg")
        .click(function() {
            createCardAtDlgPos('yellow', 2)
        });

    $("#create-card-pi-red-dlg")
        .click(function() {
            createCardAtDlgPos('red', 2)
        });

    $("#create-card-pi-green-dlg")
        .click(function() {
            createCardAtDlgPos('green', 2)
        });

    $("#create-card-pi-blue-dlg")
        .click(function() {
            createCardAtDlgPos('blue', 2)
        });

    $("#create-card-pi-white-dlg")
        .click(function() {
            createCardAtDlgPos('white', 2)
        });

    $("#create-card-pi-orange-dlg")
        .click(function() {
            createCardAtDlgPos('orange', 2)
        });

    $("#create-card-pi-purple-dlg")
        .click(function() {
            createCardAtDlgPos('purple', 2)
        });

    // Style changer
    $("#smallify").click(function() {
        if (currentTheme == "smallcards") {
            changeThemeTo('mediumcards');
        } else if (currentTheme == "mediumcards") {
            changeThemeTo('bigcards');
        } else {
            changeThemeTo('smallcards');
        }

        sendAction('changeTheme', currentTheme);
        return false;
    });

    $('#icon-col').hover(
        function() {
            $('.col-icon').fadeIn(10);
        },
        function() {
            $('.col-icon').fadeOut(150);
        }
    );

    $('#add-col').click(
        function() {
            cardCount = $(".card").size();
            if (cardCount > 0 && !confirm('Do you really want to add a column?')) {
                return false;
            }

            createColumn('New');
            return false;
        }
    );

    $('#delete-col').click(
        function() {
            cardCount = $(".card").size();
            if (cardCount > 0 && !confirm('Do you really want to delete the column?')) {
                return false;
            }

            deleteColumn();
            return false;
        }
    );

    $('#add-row').click(
        function() {
            createNewRow();
            return false;
        }
    );

    var user_name = getCookie('scrumscrum-username');

    $("#yourname-input").focus(function() {
        if ($(this).val() == 'unknown') {
            $(this).val("");
        }

        $(this).addClass('focused');
    });

    $("#yourname-input").blur(function() {
        if ($(this).val() === "") {
            $(this).val('unknown');
        }
        $(this).removeClass('focused');

        setName($(this).val());
    });

    $("#yourname-input").val(user_name);
    $("#yourname-input").blur();
    $("#yourname-li").hide();

    $("#yourname-input").keypress(function(e) {
        code = (e.keyCode ? e.keyCode : e.which);
        if (code == 10 || code == 13) {
            $(this).blur();
        }
    });

    $(".sticker").draggable({
        revert: true,
        zIndex: 1000
    });

    $(".board-outline").resizable({
        ghost: false,
        minWidth: 700,
        minHeight: 400,
        maxWidth: 3200,
        maxHeight: 1800,
    });

    //A new scope for precalculating
    (function() {
        var offsets;

        $(".board-outline").bind("resizestart", function() {
            offsets = calcCardOffset();
        });
        $(".board-outline").bind("resize", function(event, ui) {
            adjustCard(offsets, false);
            adjustEraserAndMarker(null);
        });
        $(".board-outline").bind("resizestop", function(event, ui) {
            boardResizeHappened(event, ui);
            adjustCard(offsets, true);
            adjustRows(ui.position.width);
            adjustEraserAndMarker(ui.position.height);
        });
    })();

    marker = $('#marker')
    marker.draggable({
        axis: 'x',
        containment: 'parent',
        start: function(event, ui) {
            keyTrap = null;
        },
        drag: function(event, ui) {
            if (keyTrap == 27) {
                ui.helper.css(ui.originalPosition);
                return false;
            }
        }
    });

    // After a drag
    marker.bind("dragstop", function(event, ui) {
        if (keyTrap == 27) {
            keyTrap = null;
            return;
        }

        var data = {
            id: this.id,
            x: ui.position.left
        };

        sendAction('moveMarker', data);
    });

    eraser = $('#eraser');
    eraser.draggable({
        axis: 'x',
        containment: 'parent',
        start: function(event, ui) {
            keyTrap = null;
        },
        drag: function(event, ui) {
            if (keyTrap == 27) {
                ui.helper.css(ui.originalPosition);
                return false;
            }
        }
    });

    // After a drag
    eraser.bind("dragstop", function(event, ui) {
        if (keyTrap == 27) {
            keyTrap = null;
            return;
        }

        var data = {
            id: this.id,
            x: ui.position.left
        };

        sendAction('moveEraser', data);
    });

    $('#board').click(function(event) {
        // ignore clicking on a card
        if (event.target.tagName != 'TD') {
            return;
        }

        // if clicking outsize of dialog, hide it
        var dlg = $('#buttons-dialog');
        if (dlg.css('visibility') == 'visible') {
            dlg.css('visibility', 'hidden');
        }

        if (!ctrlPressed) {
            return;
        } else {
            ctrlPressed = false;
        }

        // show create card dialog
        var top = event.pageY - 50;
        var left = event.pageX - 20;
        dlg.css({top: top + 'px', left: left + 'px', position: 'relative'});
        dlg.css('visibility', 'visible');
    });
});
