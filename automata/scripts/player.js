import { Sprite2D } from "../../z0/graphics/sprite2d.js";
import { TextureManager } from "../../z0/graphics/texturemanager.js";
import { SpriteSheet } from "../../z0/graphics/spritesheet.js";
import { getMouseX, getMouseY, isDown } from "../../z0/input/mouse.js";
import { isKeyDown } from "../../z0/input/key.js";
import *  as VAR from '../../z0/var.js'
import { angleTo } from "../../z0/math/math2d.js";
import { AARectangle } from "../../z0/physics/primitives/aarectcollider.js";
import { Main, Menu } from "../../index.js";
import { getTree } from "../../z0/z0.js";
import { AudioManager } from "../../z0/audio/audiomanager.js";

export class Player extends Sprite2D{
    static SPEED = 100;
    static DELAY = 1;

    static col_width = 25;
    static col_height = 25;

    static width = 50;
    static height = 50;

    static spritesheet;

    static maxX;
    static maxY;

    static playerX = 0;
    static playerY = 0;

    static initSpriteSheet() {
        this.spritesheet = new SpriteSheet(TextureManager.player);
        
        let size = 26;
       
        for(let i = 0; i < 8; i++) {
            let x = 0;
            let y = i * size;
  
            this.spritesheet.createFrame(x, y, size * 2, size);
        }

        for(let i = 0; i < 6; i++) {
            let x = size * 2;
            let y = i * size;

            this.spritesheet.createFrame(x, y, size * 2, size);
        }


        for(let i = 0; i < 3; i++)
            this.spritesheet.createFrame(4 * size, i * size * 2, size * 2, size * 2);

        for(let i = 0; i < 3; i++)
            this.spritesheet.createFrame(6 * size, i * size * 2, size * 2, size * 2);

        for(let i = 0; i < 2; i++)
            this.spritesheet.createFrame(8 * size, i * size * 2, size * 2, size * 2);

        
        this.maxX = VAR.canvas.width;
        this.maxY = VAR.canvas.height;

        Bullet.initSpriteSheet();
        PlayerAim.initSpriteSheet();
    }

    hp = 105;

    velX = 0;
    velY = 0;

    animTimer = 0;
    animIndex = 0;
    animMax = 8;
    animStart = 0;

    isColliding = false;

    fireDelay = 0;

    lastX = 0;
    lastY = 0;

    faceLeft = false;

    pool = [];

    healthbar;
    damageTimer = 1;

    ended = false;

    dead = false;

    aim;

    constructor(x, y) {
        super(null, TextureManager.player, x, y, Player.width * 2, Player.height, 0, 9, Player.spritesheet);

        new PlayerCol(this);

        this.lastX = this.xLoc;
        this.lastY = this.yLoc;

        this.healthbar = new Healthbar(this, -35, 50, 5, this.hp);
        this.aim = new PlayerAim(this)
    }

    deathdelay = 5;
    deathanim = 0.8;
    deathanimstartindex = 8 + 6;
    deathindex = 0;
    deathtime = 0;

    deathtriggered = false;

    angle = 0;
    _update(delta) {

        if(this.dead) {
            if(!this.deathtriggered) {
                this.setZ(20);
                this.deathtriggered = true;
            }
            this.getParent().dead.setVisible(true);
            this.getParent().dead.setAlpha(this.getParent().dead.getAlpha() + delta / 5);
            
            AudioManager.stop(AudioManager.game)
            
            if(this.deathanim <= 0) {
                if(this.deathindex < 6)
                    this.setSprite(this.deathindex + this.deathanimstartindex);
                else
                    this.setVisible(false)
                this.deathindex++;
                this.deathanim = 0.2;
            }
            this.deathanim -= delta;
            this.deathtime += delta;

            if(this.deathtime > 10) {
                getTree().setActiveScene(new Menu());
            }

            return;
        }

        this.animTimer -= delta;
        if(this.animTimer < 0) {
            this.animIndex++;
            this.animIndex %= this.animMax;

            this.setSprite(this.animStart + this.animIndex);

            this.animTimer = 0.1;
        }

        Player.playerX = this.xLoc;
        Player.playerY = this.yLoc;

        let speed = Player.SPEED * delta;
        let mX = false, mY = false;
        let x = 0, y = 0;

        if(isKeyDown('a')) {
            x =  -1
            mX = true;
        }
        if(isKeyDown('d')) {
            x = 1
            mX = true;
        }
        if(isKeyDown('w')) {
            y = -1
            mY = true;
        }
        if(isKeyDown('s')) {
            y = 1;
            mY = true;
        }

        if(mX && mY) {
            speed /= 1.41;
        }

        if(mX || mY) {
            this.velX = speed * x;
            this.velY = speed * y;
        } else {
            this.velX /= 1 + delta * 10;
            this.velY /= 1 + delta * 10;
        }

        this.setLoc(Math.min(Math.max(this.getX() + this.velX, 0), Player.maxX), Math.min(Math.max(this.getY() + this.velY, 0), Player.maxY));

        let xTarg = getMouseX();
        let yTarg = getMouseY();

        let angle = angleTo(this.xLoc, xTarg, this.yLoc, yTarg);

        this.angle = angle;

        if(isDown() && this.fireDelay <= 0) {
            
            this.createBullet(angle);

            this.fireDelay = Player.DELAY;

            AudioManager.playBurst(AudioManager.shot)

        } else {
            this.fireDelay -= delta;
        }
        
        this.damageTimer -= delta;
        if(this.isColliding) {
            this.setSprite(9)
            this.isColliding = false;
            if(this.damageTimer < 0) {
                this.hp -= 50;
                this.healthbar.setHP(Math.max(this.hp,0));
                this.damageTimer = 3;
                this.getParent().damageEffects();
            }
        }

        if(this.hp <= 0) {
            this.dead = true;
            this.getParent().dino.hp = 10000;
        }

        let intX = this.xLoc;
        let intY = this.yLoc;
        // Only update if at new position

        if(Math.abs(intX - this.lastX) > 4 || Math.abs(intY - this.lastY) > 4) {
            let grid = this.getParent().grid;
            
            if(!this.getParent().path.getTileAt(intX, intY + 20)) {
                grid.setValueAt(intX, intY + 20, Math.floor(Math.random() * 151) % 4);
                this.getParent().path.setAlpha(0.7)
            } else {
                this.getParent().path.setAlpha(1)
            }

            this.lastX = intX;
            this.lastY = intY;
        }

        if(this.velX < 0) {
            this.setSize(-Player.width * 2, 50)
        } else if(this.velX > 0) {
            this.setSize(Player.width * 2, 50)
        }
    }

    /**
     * Bullet Pooling system
     * @param {Number} xTarg 
     * @param {Number} yTarg 
     */
    createBullet(angle) {

        for(let i = 0; i < this.pool.length; i++) {
            if(this.pool[i].inactive) {
                this.pool[i].init(this.xLoc, this.yLoc, angle, this.velX, this.velY);
                return;
            }
        }
       
        this.pool.push(new Bullet(this.xLoc, this.yLoc, angle, this.velX, this.velY));
    }

    end() {
        this.ended = true;
        this.removeSelf();
    }
}

export class PlayerCol extends AARectangle {
    parent;
    constructor(parent) {
        super(parent, 0, 0, 0, Player.col_width, Player.col_height, [], [0]);
        this.parent = parent;
    }

    _onCollision(body) {
        this.parent.isColliding = true;
    }
}

export class PlayerAim extends Sprite2D {
    static spritesheet;

    static initSpriteSheet() {
        this.spritesheet = new SpriteSheet(TextureManager.player);
        this.spritesheet.createFrame(0, 12 * 32, 32 * 2, 32 * 2);
    }

    constructor(p) {
        super(p, TextureManager.player, 0, 0, 200, 200, 0, 7, PlayerAim.spritesheet);
        this.setAlpha(0.6)
    }

    _update(delta) {
        this.setRot(this.getParent().angle)
    }
}

class Bullet extends Sprite2D {
    static SPEED = 500;
    static MAX_EXPAND = 20;

    static width = 5;
    static height = 5;

    static spritesheet;

    static maxX;
    static maxY;

    static initSpriteSheet() {
        this.spritesheet = new SpriteSheet(TextureManager.player);
        this.spritesheet.createFrame(505,96, 2, 2);

        this.maxX = VAR.canvas.width + Bullet.MAX_EXPAND;
        this.maxY = VAR.canvas.height + Bullet.MAX_EXPAND;
    }

    damage = 20;
    hasCollided;
    velX = 0
    velY = 0

    inactive = false;

    constructor(x, y, rot, vX, vY) {
        super(null, TextureManager.player, x, y, 5, 2, rot, 10, Bullet.spritesheet);

        new BulletCol(this);
        this.velX = vX;
        this.velY = vY;
    }

    init(x, y, rot, vX, vY) {
        this.velX = vX;
        this.velY = vY;

        this.setRot(rot);

        this.setLoc(x, y);

        this.inactive = false;
        this.hasCollided = false;
    }

    _update(delta) {
        if(this.hasCollided || this.inactive) {
            this.destroy();
            return;
        }

        this.move(Bullet.SPEED * delta);
        this.setLoc(this.xLoc + this.velX, this.yLoc + this.velY);

        if(this.getX() > Bullet.maxX || this.getX() < -Bullet.MAX_EXPAND ||
           this.getY() > Bullet.maxX || this.getY() < -Bullet.MAX_EXPAND) {
               this.destroy();
               return;
        }
    }

    destroy() {
        this.setLoc(-500, -500);
        this.inactive = true;
    }
}

export class BulletCol extends AARectangle {
    parent;
    constructor(parent) {
        super(parent, 0, 0, 0, Bullet.width, Bullet.height, [], [1]);
        this.parent = parent;
    }

    _onCollision(body) {
        if(!this.parent.hasCollided)
            body.damage(30);
        this.parent.hasCollided = true;
    }
}

export class Healthbar extends Sprite2D {
    static spritesheet;

    static initSpriteSheet() {
        this.spritesheet = new SpriteSheet(TextureManager.player);
        this.spritesheet.createFrame(510, 2, 2, 2);
    }

    hpFull;
    width;
    constructor(parent, yOff, w, h, hp) {
        super(parent, TextureManager.player, 0, yOff, w, h, 0, 12, Healthbar.spritesheet);
        this.hpFull = hp;
        this.width = w;
    }

    setHP(val) {
        let mult = val / this.hpFull;

        this.setWidth(this.width * mult);
    }
}