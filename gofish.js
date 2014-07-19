//= requires cards.js
//= requires jquery
//= requires underscore.js

(function (_, $, cards) {
    var gofish = {  };

    gofish.debug_enabled = true;

    gofish.log = function(text) {
        if (text) {
            console.log(text);
        } else {
            console.log();
        }
    };

    gofish.debug = function(text) {
        if (gofish.debug_enabled) {
            gofish.log(text);
        }
    };

    gofish.isArray = function(entity) {
      return entity &&  Object.prototype.toString.call( entity ) === "[object Array]";
    };

    gofish.Lock = function() {

        var lock = {};

        lock.count = 0;
        lock.available = true;

        lock.acquire = function() {
            var acquired = false;
            if (lock.available) {
                lock.available = false;
                acquired = true;
            }
            return acquired;
        };

        lock.get_count = function() {
            return lock.count;
        };

        lock.release = function() {
            if (!lock.available) {
                lock.available = true;
                lock.count++;
            }
        };

        return lock;
    };

    gofish.Game = function (game_div) {
        var
            deck,
            n,
            remainingCards,
            that = this;

        this.play_game_callback = function () {
            var this_game = that;
            return function() {
                this_game.play()
            };
        };

        this.ui_div = game_div;
        this.game_ui = gofish.UI(game_div, this.play_game_callback());
        this.player_interval = 0;
        this.ocean = [];
        this.players = {};
        this.dealer = gofish.Dealer();
        this.notify_on_game_ready = [];

        if (console) {
            console.log("new game");
        }

        this.game_over_handler = function(player_hand_out) {
            var
                the_players = that.players;

            clearInterval(that.player_interval);
            _.values(the_players).forEach(player_hand_out);
            console.log("game over");
        };

        /**
         * Register callback to be called when ready to start game.
         */
        this.register_listener_ready_to_start = function(cb) {
            if (cb) {
                this.notify_on_game_ready.push(cb);
            }
        };

        /**
         * Returns a UI callback to handle when a player has a new card added to their hand.
         * Callback accepts two parameters:
         *  # player_name - the name of the player
         *  # card - the card to be removed from the player's hand
         * @returns a callback to handle when a player has a new card
         */
        this.new_card_in_hand_handler = function () {
            var
                gm_ui = this.game_ui;

            return function(player_name, card) {
                if (gm_ui) {
                    gm_ui.add_card(player_name, card);
                }
            };
        };


        /**
         * Returns UI callback to handle when a player has a found new pairs/books in their hand.
         * Callback accepts two parameters:
         *  # player_name - the name of the player
         *  # book_pr - the pair of cards to be added to player's set of pairs/books.
         * @returns a callback to handle when a player has a found new pairs/books
         */
        this.new_book_pairs_handler = function () {
            var
                gm_ui = this.game_ui;

            return function(player_name, book_pr) {
                if (gm_ui) {
                    gm_ui.add_book(player_name, book_pr);
                }
            };
        };


        /**
         * Returns UI callback to handle when a player has a card removed from their hand.
         * Callback accepts two parameters:
         *  # player_name - the name of the player
         *  # card - the card to be removed from the player's hand
         * @returns a callback to handle removing card from player's hand
         */
        this.remove_card_in_hand_handler = function () {
            var
                gm_ui = this.game_ui;

            return function(player_name, card) {
                if (gm_ui) {
                    gm_ui.remove_card(player_name, card);
                }
            };
        };

        /**
         * Initializes the game -- creates players, deals cards, sets up ocean.
         */
        this.initialize = function (names) {
            var cb;
            console.log("initialize game");

            // Create Players
            if (names && names.length > 0) {
                for (n in names) {
                    if (typeof names[n] !== 'function') {
                        console.log("create player: " + names[n]);
                        this.players[names[n]]= new gofish.Player(names[n]);
                        this.players[names[n]].register_hand_change({on_add: this.new_card_in_hand_handler(), on_remove: this.remove_card_in_hand_handler()});
                        this.players[names[n]].register_books_change({on_add: this.new_book_pairs_handler()});
                    }
                }
            }

            if (this.game_ui) {
                this.game_ui.set_players(_.keys(this.players));
            }

            // Deal cards
            console.log("initialize cards");
            deck = cards.buildDeck(cards.suitSet, cards.valueSet, false);

            console.log("deal cards and establish ocean");
            remainingCards = this.dealer.deal(_.values(this.players), deck, this.cardsPerPlayer(_.values(this.players).length));
            this.ocean = remainingCards;

            if (this.ocean && this.ocean.length) {
                console.log("Ocean size: " + this.ocean.length);
            }

            // Check
            // Print contents of hands & books
            player_objs = _.values(this.players);
            for (n in player_objs) {
                if (typeof player_objs[n] !== 'function') {
                    var buffer = { text: '', set: function(input) { if (input) { this.text = input; } } };
                    player_objs[n].print_hand(buffer);
                    console.log("Player '" + player_objs[n].get_name() + "': " + buffer.text);
                    player_objs[n].find_books();
                    player_objs[n].print_hand(buffer);
                    console.log("Player '" + player_objs[n].get_name() + "': " + buffer.text);
                    player_objs[n].print_books(buffer);
                    console.log("Player '" + player_objs[n].get_name() + "': " + buffer.text);
                }
            }

            for (cb in this.notify_on_game_ready) {
                if (this.notify_on_game_ready[cb] && typeof this.notify_on_game_ready[cb] === 'function') {
                    this.notify_on_game_ready[cb]();
                }
            }
        };

        this.cardsPerPlayer = function (playerCount) {
            console.log("determine # of cards per player -- total players = " + playerCount);
            if (!playerCount || playerCount <= 0) {
                return 0;
            }
            if (playerCount <= 4) {
                return 7;
            }
            if (playerCount <= 9) {
                return 4;
            }
            return 0;
        };

        this.method = function (name, func) {
            if (!this.prototype[name]) {
                this.prototype[name] = func;
                return this;
            }
        };

        this.start = function (names) {
            console.log("start game");
            if (names || names.length > 0) {
                this.initialize(names);
            }
        };

        /**
         * Returns a function for a player to 'go fish' in the ocean during the player's turn.
         *
         * In other words the returned function is a callback meant to be called
         * during the player turn after the opponent asked for some card value says 'go fish'.
         *
         * The callback takes two parameters:
         *  # targets - a map containing the player_name, card_value, and the player (who has the turn in progress)
         *  # transfer_method - the means by which the player accepts a new card
         *               (a function that takes a card as the first argument).
         * @param the_ocean an array of cards
         */
        this.go_fishing = function(the_ocean) {
          var
              focean     = the_ocean,
              player_map = that.players;

          return function(targets, transfer_method) {
              var
                  ocean_result,
                  rplayer_name,
                  req_value,
                  req_player,
                  take_card;

              if (targets && targets.hasOwnProperty('self') && targets.hasOwnProperty('player_name') && targets.hasOwnProperty('card_value')) {
                  req_value = targets['card_value'];
                  rplayer_name = targets['player_name'];
                  if (rplayer_name && player_map[rplayer_name]) {
                      req_player = player_map[rplayer_name];
                  }
              }

              if (req_player && req_player.has_card && req_player.has_card(req_value)) {
                 take_card = req_player.turnover_card(req_value);
                 console.log("player has card with value '" + req_value + "'; relinquishes " + take_card.get_name());
              } else {
                  ocean_result = '';
                  if (focean.length > 0) {
                     take_card = focean.pop();
                     ocean_result = "selects " + take_card.get_name();
                  } else {
                      ocean_result = "ocean is empty.";
                  }
                  console.log(targets['self'].get_name() + " must gofish; " + ocean_result);
              }

              // TODO make code more readable
              // If card taken either from ocean or another player,
              //  then accept card and find any pairs/books in hand
              if (take_card && targets['self'].hasOwnProperty(transfer_method)) {
                  targets['self'][transfer_method](take_card);
                  targets['self'].find_books();
              }
          };
        };

        this.play = function() {
            // select starting player
            // iterate through players

            var
                buffer,
                //curr_player,
                //curr_turn,
                do_player_turn,
                //other_plyrs,
                // plyrs,
                players_hands_are_empty,
                print_player_hand_book,
                // turn_no = 0,
                turn_no_lock = gofish.Lock(),
                turn_names = _.keys(this.players);

            print_player_hand_book = function (f_player) {
                buffer = { text: '', set: function(input) { if (input) { this.text = input; } } };

                f_player.print_hand(buffer);
                console.log("Player '" + f_player.get_name() + "': " + buffer.text);

                f_player.print_books(buffer);
                console.log("Player '" + f_player.get_name() + "': " + buffer.text);
            };

            /**
             * Returns true if all the players in the specified array/list have empty hands
             * (no more cards to play).
             * @param f_players {Array} list of players
             * @return true if all players in list have empty hands; otherwise false
             */
            players_hands_are_empty = function(f_players) {

                return  _.reduce(
                            f_players,
                            function(memo, f_player) {
                              return f_player.hand_is_empty() && memo;
                            },
                            true
                        );
            };

            /**
             * Returns function to execute player's turn.
             * @return {Object} function to execute player's turn
             */
            do_player_turn = function () {
                var curr_turn,
                    curr_player,
                    do_go_fish       = that.go_fishing,
                    game_end_handler = that.game_over_handler,
                    other_plyrs, plyrs,
                    the_ocean        = that.ocean,
                    the_ocean_size   = that.ocean_size,
                    the_players      = that.players,
                    the_turn_names   = turn_names,
                    turn_lock        = turn_no_lock;

                return function () {
                    var turn_count;
                    if (turn_lock.acquire()) {
                        turn_count = turn_lock.get_count();

                        curr_player = the_players[the_turn_names[turn_count % the_turn_names.length]];
                        if (curr_player.hand_is_empty()) {
                            console.log("Player '" + curr_player.get_name() + "' has no more cards; skipping.");
                        } else {

                            buffer = { text: '', set: function(input) { if (input) { this.text = input; } } };
                            curr_player.print_hand(buffer);
                            console.log("[turn-" + (turn_count < 9? "0": "") + turn_count + "] Player '" + curr_player.get_name() + "': " + buffer.text);

                            plyrs = _.keys(the_players);
                            other_plyrs = _.filter(plyrs, function(plyr) {
                                return plyr !== curr_player.get_name();
                            });

                            curr_turn = new gofish.Turn(curr_player, other_plyrs);

                            curr_player.take_turn(curr_turn, do_go_fish(the_ocean));
                            console.log("ocean size: " + the_ocean_size());
                        }

                        // check if all players hands are empty (game is over)
                        if (players_hands_are_empty(_.values(the_players))) {
                            game_end_handler(print_player_hand_book);
                        }

                        turn_lock.release();
                    }
                };
            };

             this.player_interval = setInterval(do_player_turn(), 600);
        };

        this.ocean_size = function() {
            var size = 0;
            if (this.ocean) {
                size = this.ocean.length;
            }
            return size;
        };
        this.register_listener_ready_to_start(this.game_ui.handle_ready_to_start);
    };

    gofish.Turn = function(player, otherPlayers) {
      var
          player_names = [],
          //pname        = '',
          //requested_value,
          val; //,
          //req_player,
          //rcard,
          //rplayer_name;

        this.req_card = 0;

        this.get_player_names = function () {
            return player_names;
        };

        this.card = function() {
            val = null;

            //TODO what does this do? is this.req_card ever truthy
            if (this.req_card && this.req_card.get_value) {
                val = this.req_card.get_value();
            }
            return val;
        }

        if (otherPlayers && gofish.isArray(otherPlayers) && otherPlayers.length) {
            player_names = otherPlayers;
        }
    };

    gofish.Player = function (label) {
        var notify_listeners, plyr_label = label;
        this.done = false;
        this.name = label;
        this.hand = {};
        this.books = {};

        this.hand_is_empty = function() {
            return this.done;
        };

        this.notify_on_hand_change = [];
        this.notify_on_books_change = [];

        this.register_hand_change = function(hand_change_listener) {
            if (typeof hand_change_listener === 'object') {
                this.notify_on_hand_change.push(hand_change_listener);
            }
        };

        this.register_books_change = function(books_change_listener) {
            if (typeof books_change_listener === 'object') {
                this.notify_on_books_change.push(books_change_listener);
            }
        };

        notify_listeners = function (change, listeners, changed) {
            if (listeners && listeners.length > 0) {
                listeners.forEach(function(listening) {
                    if (listening[change] && typeof listening[change] === 'function') {
                        listening[change](plyr_label, changed);
                    }
                });
            }
        };

        /**
         * Add card to hand
         * @param card card to add to hand
         */
        this.addCard = function (card) {
            if (card) {
                if (!this.hand[card.get_value()]) {
                    this.hand[card.get_value()] = [];
                }
                this.hand[card.get_value()].push(card);

                notify_listeners('on_add', this.notify_on_hand_change, card);
            }
        };

        /**
         * Get players name/moniker
         * @return {String}
         */
        this.get_name = function () {
            return this.name;
        };

        /**
         * Indicates if card with specified face value is in hand
         * @param value face value of targeted card
         * @return {Boolean} true if hand contains card of specified value
         */
        this.has_card = function (value) {
           var in_hand = false;
           if (value && this.hand[value] && gofish.isArray(this.hand[value]) && this.hand[value].length > 0) {
               in_hand = true;
           }
           return in_hand;
        };

        /**
         * Removes card from hand
         * @param card_value
         * @return cards to be turned-over
         */
        this.turnover_card = function(card_value) {
            var the_card = '';

            if (this.has_card(card_value)) {
                the_card = this.hand[card_value].pop()
                notify_listeners('on_remove', this.notify_on_hand_change, the_card);
            }
            return the_card;
        };

        /**
         * Add card to hand
         * @param card card to add to hand
         */
        this.accept_card = function (card) {
           if (card) {
               this.addCard(card);
           }
        };

        /**
         * Prints contents of hand to specified buffer
         * @param buffer
         */
        this.print_hand = function (buffer) {
            if (buffer && buffer.set) {
                var value_cards, item, val, str = '';
                for (val in this.hand) {
                    value_cards = this.hand[val];
                    if (value_cards && gofish.isArray(value_cards) && value_cards.length > 0) {
                        for (item in value_cards) {
                            if (value_cards[item] && typeof value_cards[item] !== 'function' && value_cards[item].get_name) {
                                if (str) {
                                    str = str + ",";
                                }
                                str = str + value_cards[item].get_name();
                            }
                        }
                    }
                }
                buffer.set(str);
            }
        };

        /**
         * Finds 2 cards with same face value in hand and moves
         * them to books
         */
        this.find_books = function() {
            if (this.hand) {
                var pair, val, value_cards;
                for (val in this.hand) {
                    value_cards = this.hand[val];
                    if (value_cards && gofish.isArray(value_cards) && value_cards.length > 1) {
                        if (!this.books[val]) {
                            this.books[val] = [];
                        }
                        pair = [value_cards.pop(), value_cards.pop()];
                        this.books[val].push(pair);

                        notify_listeners('on_remove', this.notify_on_hand_change, pair[0]);
                        notify_listeners('on_remove', this.notify_on_hand_change, pair[1]);
                        notify_listeners('on_add', this.notify_on_books_change, pair);
                    }
                }
            }
        };

        /**
         * Writes pairs of cards in 'books' to specified buffer
         * @param buffer
         */
        this.print_books = function(buffer) {
            var book, val, value_arr, txt = '';
            if (buffer && buffer.set && this.books) {
                for (val in this.books) {
                    value_arr = this.books[val];
                    if (value_arr && gofish.isArray(value_arr) && value_arr.length > 0) {
                        value_arr.forEach( function (elem) {
                            if (elem && gofish.isArray(elem)) {
                                if (txt) {
                                    txt = txt + ", ";
                                }
                                txt = txt + "[";
                                elem.forEach(function(bk_card) {
                                    if (bk_card && bk_card.get_name) {
                                        txt = txt + bk_card.get_name();
                                    }
                                });
                                txt = txt + "]";
                            }
                        });
                    }
                }
                buffer.set(txt);
            }
        };

        this.take_turn = function(turn, go_fish) {
            var hand_values, val, oplayers, target_player, no_card_available;

            no_card_available = function(playing_hand, card_val) {
                return !card_val || !playing_hand[card_val] || playing_hand[card_val].length === 0;
            }

            if (!this.done) {
                oplayers = turn.get_player_names();

                if (oplayers && gofish.isArray(oplayers)) {
                    if (oplayers.length === 1) {
                        target_player = oplayers[0];
                    } else {
                        target_player = oplayers[_.random(0, oplayers.length - 1)];
                    }
                }

                hand_values = _.keys(this.hand);
                hand_values = _.shuffle(hand_values);

                do {
                  val = hand_values.pop();
                } while ((!gofish.isArray(this.hand[val]) || this.hand[val].length === 0) && hand_values.length !== 0);

                if (no_card_available(this.hand,val)) {
                    console.log(this.get_name() + " has no more cards.");
                    this.done = true;
                } else {
                    console.log(this.get_name() + " asks player '"+ target_player +"' for " + val);
                    go_fish({'self': this, 'player_name': target_player, 'card_value': val }, 'accept_card');
                }
            }
        };
    };


    gofish.Dealer = function () {
        var dealer = {};

        /**
         * Deals cards from deck to players. Number of cards each player
         * receives depends on the number of players in the game.
         * @param players
         * @param cardDeck
         * @param numCardsPerPlayer
         * @return {Array} remaining cards not dealt to players
         */
        dealer.deal = function (players, cardDeck, numCardsPerPlayer) {
            var fplayers                = players,
                shuffledDeck            = 0,
                fLeftOvers              = [],
                fall_players_have_cards = false,
                fPlayerIndex            = 0,
                fCardNo                 = 0,
                fMax                    = numCardsPerPlayer;

            if (cardDeck) {
                shuffledDeck = cardDeck.shuffle();
                shuffledDeck.iter( function (card) {
                    if (fall_players_have_cards) {
                        fLeftOvers.push(card);
                    } else {
                        fplayers[fPlayerIndex].accept_card(card);
                        fPlayerIndex = fPlayerIndex + 1;
                        if (fPlayerIndex === players.length) {
                            fCardNo = fCardNo + 1;
                            fPlayerIndex = 0;
                        }
                        if (fCardNo === fMax) {
                            fall_players_have_cards = true;
                        }
                    }
                } );
            }
            return fLeftOvers;
        };
        return dealer;
    };

    gofish.UI = function(game_div, start_cb) {
        var
            ui            = {
                home_div      : 0,
                game_main_div : 0,
                game_ctrl_div : 0,
                plyr_uis      : {},
                start_game_cb : start_cb
            },
            book_id      = "books",
            hand_id      = "hand",
            game_layout  = 0,
            book_div     = 0,
            hand_div     = 0,
            plyr_div     = 0,
            start_btn    = 0,
            start_id     = "start",
            that         = this;



        ui.handle_ready_to_start = function() {
            var starter = $("#" + start_id);
            if (starter) {
                starter.attr("disabled", false);
            }
        };

        ui.set_players = function(plyr_names) {
            var nm,
                p_nm,
                p_header,
                book_div     = 0,
                hand_div     = 0,
                plyr_div     = 0;

            if (ui.game_main_div && plyr_names && gofish.isArray(plyr_names) && plyr_names.length) {
                for (nm in plyr_names) {
                    p_nm = plyr_names[nm];

                    plyr_div = $("<div/>", {'id': p_nm });
                    plyr_div.addClass("ui-corner-all");
                    plyr_div.css("display", "inline-block");
                    plyr_div.width("360px");
                    plyr_div.height("800px");
                    plyr_div.css({ border: "1px solid grey"}); //, float: "left"});
                    plyr_div.css("background-color", "#cc9999");

                    ui.plyr_uis[p_nm] = plyr_div;
                    p_header = $("<h3/>").text(p_nm);
                    p_header.addClass("ui-widget-header");
                    ui.plyr_uis[p_nm].append(p_header);

                    hand_div = $("<div/>", {'id': hand_id });
                    hand_div.addClass("ui-corner-all");
                    hand_div.width("360px");
                    hand_div.height("200px");
                    hand_div.css("background-color", "#99cc66");

                    ui.plyr_uis[p_nm].append(hand_div);

                    book_div = $("<div/>", {'id': book_id});
                    book_div.addClass("ui-corner-all");
                    book_div.width("360px");
                    book_div.height("400px");
                    book_div.css("background-color", "#ccccff");

                    ui.plyr_uis[p_nm].append(book_div);

                    ui.game_main_div.append(ui.plyr_uis[p_nm]);
                }
            }
        };

        ui.add_card = function (plyr_name, card) {
            var hand_div = $("#" + plyr_name).find("#" + hand_id);
            if (hand_div) {
                hand_div.append($("<img/>", {src: card.img_path(), id: card.get_name(), alt: plyr_name}));
            }
        };

        ui.remove_card = function(plyr_name, card) {
            var
                f_card   = 0,
                hand_div = $("#" + plyr_name).find("#" + hand_id);

            if (hand_div) {
                f_card = hand_div.find("#" + card.get_name());
                if (f_card) {
                  f_card.hide( "highlight", {}, 1000);
                  f_card.remove();
                }
            }
        };

        ui.add_book = function (plyr_name, pair) {
            var
                new_pair    = 0,
                pr_item     = 0,
                book_div    = $("#" + plyr_name).find("#" + book_id);

            if (book_div) {
                new_pair = $("<div/>").width("110px");
                new_pair.css("display", "inline-block");
                new_pair.css("margin-left", "4px");
                new_pair.css("margin-right", "2px");

                for (pr_item in pair) {
                    //TODO test if pair[pr_item] is inherited from object
                    new_pair.append($("<img/>", {src: pair[pr_item].img_path(), id: pair[pr_item].get_name(), alt: pair[pr_item].get_name()}));
                }

                book_div.append(new_pair);
                new_pair.hide();
                new_pair.show("drop",{},500);
            }
        };

        if (game_div) {

            ui.home_div = $("<div/>", {id: "container"}).css({"background": "#999", "height": "100%", "margin": "0 auto", "width": "100%", "max-width": "900px", "min-width": "700px"});
            $("#" + game_div).append(ui.home_div);

            ui.game_main_div = $("<div/>", {id: "l-center"}).addClass("pane ui-layout-center");
            ui.home_div.append(ui.game_main_div);

            ui.game_ctrl_div = $("<div/>", {id: "l-north"}).addClass("pane ui-layout-north");
            ui.home_div.append(ui.game_ctrl_div);

            ui.home_div.append($("<div/>", {id: "l-south"}).addClass("pane ui-layout-south"));
            ui.home_div.append($("<div/>", {id: "l-east"}).addClass("pane ui-layout-east"));
            ui.home_div.append($("<div/>", {id: "l-west"}).addClass("pane ui-layout-west"));

            start_btn = $("<button/>", {id: start_id});
            start_btn.addClass("ui-state-default");
            start_btn.addClass("ui-corner-all");
            start_btn.text("Start Game");
            start_btn.click( function() {
              ui.start_game_cb();
            });
            start_btn.attr("disabled", true);
            ui.game_ctrl_div.append(start_btn);

            game_layout = ui.home_div.layout();
            game_layout.toggle("west");
            game_layout.toggle("east");
        }
        return ui;
    };

    if (window && !window.gofish) {
        window.gofish = gofish;
    }
    return gofish;
}(_, jQuery, cards || {} ));
