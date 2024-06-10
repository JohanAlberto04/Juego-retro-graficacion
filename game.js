class MainMenu extends Phaser.Scene {
  constructor() {
    super({ key: 'mainmenu' });
  }

  preload() {
    this.load.image('background', 'images/background.png');
    this.load.image('lives', 'images/lives.png');
  }

  create() {
    this.add.image(410, 250, 'background');
    const title = this.add.text(this.game.config.width / 2, 100, 'Select Difficulty', { fontSize: '40px', fill: '#fff' });
    title.setOrigin(0.5);

    const easyButton = this.add.text(this.game.config.width / 2, 200, 'Easy', { fontSize: '32px', fill: '#fff' });
    easyButton.setOrigin(0.5);
    easyButton.setInteractive();
    easyButton.on('pointerdown', () => {
      this.startGame('easy');
    });

    const mediumButton = this.add.text(this.game.config.width / 2, 300, 'Medium', { fontSize: '32px', fill: '#fff' });
    mediumButton.setOrigin(0.5);
    mediumButton.setInteractive();
    mediumButton.on('pointerdown', () => {
      this.startGame('medium');
    });

    const hardButton = this.add.text(this.game.config.width / 2, 400, 'Hard', { fontSize: '32px', fill: '#fff' });
    hardButton.setOrigin(0.5);
    hardButton.setInteractive();
    hardButton.on('pointerdown', () => {
      this.startGame('hard');
    });
  }

  startGame(difficulty) {
    this.scene.start('game', { difficulty: difficulty });
  }
}

export class Game extends Phaser.Scene {
  constructor() {
    super({ key: 'game' });
    this.currentLevel = 1;
    this.totalScore = 0;
    this.levelThresholds = [1000, 2200, 3300, 4400, 5600];
    this.maxLives = 3;
  }

  init(data) {
    this.difficulty = data.difficulty;
  }

  preload() {
    this.load.image('background', 'images/background.png');
    this.load.image('gameover', 'images/gameover.png');
    this.load.image('platform', 'images/platform.png');
    this.load.image('alien', 'images/alien.png');
    this.load.image('lives', 'images/lives.png');
    this.load.audio('gameMusic', 'sounds/gameMusic.mp3');
    this.load.audio('shootLine', 'sounds/shootLine.wav');
    this.load.audio('gameOver', 'sounds/gameOver.wav');
    this.load.audio('levelUp', 'sounds/levelUp.wav');
    this.load.audio('destroyObject', 'sounds/destroyObject.wav');
    this.load.audio('collision', 'sounds/collision.wav');
    this.load.audio('catchHeart', 'sounds/catchHeart.wav');
  }

  create() {
    this.add.image(410, 250, 'background');
    this.gameoverImage = this.add.image(400, 90, 'gameover');
    this.gameoverImage.visible = false;

    this.platform = this.physics.add.image(this.game.config.width / 2, this.game.config.height - 50, 'platform');
    this.platform.body.allowGravity = false;
    this.platform.setOrigin(0.5, 1);
    this.platform.setScale(0.2);
    this.platform.setCollideWorldBounds(true);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.lives = this.maxLives;
    this.setDifficulty();
    this.createFallingObjects();

    this.physics.add.collider(this.platform, this.objects, this.catchObject, null, this);
    this.physics.add.collider(this.platform, this.hearts, this.catchHeart, null, this);
    this.physics.add.collider(this.lines, this.objects, this.destroyLine, null, this);

    this.score = 0;
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });
    this.levelText = this.add.text(16, 48, 'Level: 1', { fontSize: '32px', fill: '#fff' });
    this.livesText = this.add.text(16, 80, 'Lives: 3', { fontSize: '32px', fill: '#fff' });
    this.livesDisplay = [];
    this.displayLives();

    this.input.on('pointerdown', (pointer) => {
      if (!this.gameMusic) {
        this.initializeAudio(); // Inicializar audio después de la interacción del usuario
      }
      if (pointer.leftButtonDown()) {
        this.createLines(pointer); // Disparar láser al hacer clic
      }
    });
  }

  initializeAudio() {
    this.gameMusic = this.sound.add('gameMusic');
    this.gameMusic.play({ loop: true });
  }

  setDifficulty() {
    switch (this.difficulty) {
      case 'easy':
        this.objectFallSpeed = 50;
        break;
      case 'medium':
        this.objectFallSpeed = 75;
        break;
      case 'hard':
      default:
        this.objectFallSpeed = 100;
        break;
    }
  }

  update() {
    if (this.cursors.left.isDown || this.keyA.isDown) {
      if (this.platform.x > this.platform.width / 2) {
        this.platform.setVelocityX(-500);
      }
    }
    else if (this.cursors.right.isDown || this.keyD.isDown) {
      if (this.platform.x < this.game.config.width - this.platform.width / 2) {
        this.platform.setVelocityX(500);
      }
    }
    else {
      this.platform.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyP)) {
      if (this.physics.world.isPaused) {
        this.resumeGame();
      } else {
        this.pauseGame();
      }
    }

    if (this.totalScore >= this.levelThresholds[this.currentLevel - 1]) {
      this.advanceLevel();
    }
  }

  createFallingObjects() {
    this.objects = this.physics.add.group();
    this.hearts = this.physics.add.group();
    this.lines = this.physics.add.group();

    this.objectTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(0, this.game.config.width);
        const object = this.objects.create(x, 0, 'alien');
        object.setVelocityY(this.objectFallSpeed + (this.currentLevel - 1) * 20);
        object.setScore = true;
      }
    });

    this.heartTimer = this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(0, this.game.config.width);
        const heart = this.hearts.create(x, 0, 'lives');
        heart.setVelocityY(this.objectFallSpeed);
      }
    });
  }

  catchObject(platform, object) {
    this.platform.setAlpha(0.5);
    this.time.delayedCall(500, () => {
      this.platform.setAlpha(1);
      this.platform.x = this.game.config.width / 2;
      this.platform.setVelocityX(0);
    });
    this.sound.play('collision');
    object.destroy();
    this.lives--;
    this.updateLives();
    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  catchHeart(platform, heart) {
    heart.destroy();
    this.sound.play('catchHeart');
    this.lives++;
    if (this.lives > this.maxLives) {
      this.lives = this.maxLives;
    }
    this.updateLives();
  }

  gameOver() {
    this.pauseGame();
    this.gameoverImage.visible = true;
    this.gameMusic.stop();
    this.sound.play('gameOver');

    const gameOverText = this.add.text(this.game.config.width / 2, this.game.config.height / 2, 'Game Over', { fontSize: '32px', fill: '#fff' });
    gameOverText.setOrigin(0.5);

    const restartButton = this.add.text(this.game.config.width / 2, this.game.config.height / 2 + 50, 'Restart', { fontSize: '24px', fill: '#fff' });
    restartButton.setOrigin(0.5);
    restartButton.setInteractive();
    restartButton.on('pointerdown', () => {
      this.scene.restart();
      this.gameoverImage.visible = false;
      gameOverText.destroy();
      restartButton.destroy();
    });
  }

  pauseGame() {
    this.physics.pause();
    this.gameMusic.pause();
    this.objectTimer.paused = true; // Pausar la generación de objetos
    this.heartTimer.paused = true;  // Pausar la generación de corazones
  }

  resumeGame() {
    this.physics.resume();
    this.gameMusic.resume();
    this.objectTimer.paused = false; // Reanudar la generación de objetos
    this.heartTimer.paused = false;  // Reanudar la generación de corazones
  }

  advanceLevel() {
    this.currentLevel++;
    this.sound.play('levelUp');

    const levelText = this.add.text(this.game.config.width / 2, this.game.config.height / 2, `Nivel ${this.currentLevel}`, { fontSize: '32px', fill: '#fff' });
    levelText.setOrigin(0.5);
    this.time.delayedCall(2000, () => {
      this.resumeGame();
      levelText.destroy();
    });
  }

  updateScore() {
    this.scoreText.setText('Score: ' + this.totalScore);
  }

  updateLives() {
    this.livesText.setText('Lives: ' + this.lives);
    this.livesDisplay.forEach(liveIcon => liveIcon.destroy());
    this.livesDisplay = [];
    for (let i = 0; i < this.lives; i++) {
      const liveIcon = this.add.image(750 - i * 40, 50, 'lives').setScale(0.5);
      this.livesDisplay.push(liveIcon);
    }
  }

  displayLives() {
    for (let i = 0; i < this.lives; i++) {
      const liveIcon = this.add.image(750 - i * 40, 50, 'lives').setScale(0.5);
      this.livesDisplay.push(liveIcon);
    }
  }

  createLines(pointer) {
    if (pointer.leftButtonDown()) {
      const line1 = this.add.line(this.platform.x, this.platform.y, 0, 0, 0, 50, 0xFF0000);
      const line2 = this.add.line(this.platform.x, this.platform.y, 0, 0, 0, -50, 0xFF0000);

      this.tweens.add({
        targets: line1,
        y: line1.y - 50,
        duration: 500,
        onComplete: () => line1.destroy()
      });

      this.tweens.add({
        targets: line2,
        y: line2.y - 800,
        duration: 1000,
        onComplete: () => line2.destroy()
      });

      this.lines.add(line1);
      this.lines.add(line2);

      this.sound.play('shootLine');
    }
  }

  destroyLine(line, object) {
    line.destroy();
    object.destroy();
    this.totalScore += 100;
    this.updateScore();
    this.sound.play('destroyObject');
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 800,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false
    }
  },
  scene: [MainMenu, Game]
};

const game = new Phaser.Game(config);
