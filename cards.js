
( function() {

    // From 'Javascript: the Good Parts' page 33
    var newMethod = function (name, func) {
          if (!this.prototype[name]) {
              this.prototype[name] = func;
              return this;
          }
      };
    if (Object.defineProperty) {
      Object.defineProperty(Object.prototype, "method", {value: newMethod, writable: false});
    } else {
      Object.prototype.method = function (name, func) {
          if (!this.prototype[name]) {
              this.prototype[name] = func;
              return this;
          }
      };
    }

    var cards = {};

    cards.isArray = function(entity) {
      return entity &&  Object.prototype.toString.call( entity ) === "[object Array]";
    };

    cards.Suit = function (name, abbr, symbol) {
        this.sName = name;
        this.sAbbr = abbr;
        this.sChar = symbol;
    };

    cards.Suit.method('toString', function () {
        return "Suit: " + this.sName;
    });
    cards.Suit.method('get_name', function () {
        return this.sName;
    });
    cards.Suit.method('abbr', function () {
        return this.sAbbr;
    });
    cards.Suit.method('symbol', function () {
        return this.sChar;
    });

    cards.suitSet = [new cards.Suit('heart', 'H', '\u2661'), new cards.Suit('club', 'C', '\u2667'), new cards.Suit('diamond', 'D', '\u2662'), new cards.Suit('spade', 'S', '\u2664')];
    cards.valueSet = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Joker'];

    cards.Card = function (faceSuit, faceValue, faceType) {
        var short_card_value_str;
        this.type = faceType;
        this.value = faceValue;
        this.suit = faceSuit;
        this.img_rel_path;

        if (this.suit) {
            short_card_value_str = this.value;
            if (this.value && typeof this.value === 'string' && this.value.length > 2) {
                short_card_value_str = this.value.charAt(0);
            }
            this.img_rel_path = "cards/50px-Playing_card_" + this.suit.get_name() + "_" + short_card_value_str + ".png";
        }
    };
    cards.Card.method('img_path', function() {
        return this.img_rel_path;
    });
    cards.Card.method('get_value', function () {
        return this.value;
    });
    cards.Card.method('getSuit', function () {
        return this.suit;
    });
    cards.Card.method('get_name', function () {
        return this.suit ? this.suit.symbol() + this.value : this.type + " " + this.value;
    });
    cards.Card.method('toString', function () {
        var str = '';
        if (this.type) {
            str = this.type;
        } else {
          str = this.suit? this.suit.abbr(): '?';
        }
        return this.value + '-' + str;
    });
    cards.CardSet = function (p_cards) {
        var c;
        this.deck = [];
        if (p_cards && cards.isArray(p_cards)) {
            for (c in p_cards) {
              if (typeof p_cards[c] !== 'function') {
                this.deck.push(p_cards[c]);
              }
            }
        }
    };

    cards.CardSet.method('toString', function () {
        var card, str = '';
        for (card in this.deck) {
            if (str) {
                str = str.concat(', ');
            }
            if (card && card.toString) {
                str = str.concat(card.get_name());
            } else {
                str = str.concat(card);null
            }
        }
        return str;
    });


    cards.CardSet.method('iter', function(func) {
        var card;
        if (func && typeof(func) === 'function') {
          for (card in this.deck) {
              if (typeof this.deck[card] !== 'function') {
                 func(this.deck[card]);
              }
          }
        }
    });

    cards.CardSet.method('size', function() {
      return this.deck? this.deck.length: 0;
    });

    cards.CardSet.method('shuffle', function() {
        var val, w, x,y, z, index=0, count=0, newDeck=[], used=-999, indices = [used];
        for (val in this.deck) {
            if (typeof this.deck[val] !== 'function') {
                indices.push(count);
                count++;
            }
        }

        for (val in this.deck) {
            if (typeof this.deck[val] !== 'function') {
                do {
                    index = Math.round(count * Math.random());
                } while(index <= 0 || index > count || indices[index] === used);
                newDeck.push(this.deck[indices[index]]);
                indices[index] = used;
            }
        }
        return new cards.CardSet(newDeck);
    });

    cards.buildDeck = function (suits, faceValues, withJokers) {
        var suit, val, type, cardDeck = [],  colors = ['black', 'red'];
        for (suit in suits) {
            if ( typeof suits[suit] !== 'function') {
                for (val in faceValues) {
                    if (faceValues[val] !== 'Joker' && typeof faceValues[val] !== 'function') {
                        cardDeck.push(new cards.Card(suits[suit], faceValues[val]));
                    }
                }
            }
        }
        if (withJokers) {
            for (val in colors) {
                if (typeof colors[val] !== 'function') {
                    cardDeck.push(new cards.Card(null, 'Joker', colors[val]));
                }
            }
        }
        return new cards.CardSet(cardDeck);
    };


    if (window && !window.cards) {
        window.cards = cards;
    }
    return cards;
})();
