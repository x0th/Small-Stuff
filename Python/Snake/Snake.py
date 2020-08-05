import random as rand
import pygame

# 0 = empty, 2 = player head, 1 = player body, 3 = food
def init_board() :
    global snake
    global direction
    global food
    global squarespace
    for i in range(squarespace):
        row = []
        for j in range(squarespace):
            row.append(0)
        gameboard.append(row)

    x = rand.randint(2, squarespace - 3)
    y = rand.randint(2, squarespace - 3)
    gameboard[y][x] = 2
    snake.append([y, x])
    dir = [0, 0]
    dir_all = rand.randint(1, 4)
    direction = [dir_all, dir_all, dir_all]
    if(dir_all == 1):
        dir[1] = 1
    elif(dir_all == 2):
        dir[1] = -1
    elif(dir_all == 3):
        dir[0] = 1
    elif(dir_all == 4):
        dir[0] = -1
    for i in range(1, 3):
        gameboard[y + i*dir[1]][x + i*dir[0]] = 1
        snake.append([y + i*dir[1],x + i*dir[0]])

    spawn_food()

# spawn food in a square with no player
def spawn_food() :
    global gameboard
    global food
    global squarespace
    while(True):
        f_x = rand.randint(0, squarespace-1)
        f_y = rand.randint(0, squarespace-1)
        if(gameboard[f_x][f_y] == 0):
            gameboard[f_x][f_y] = 3
            food = [f_x, f_y]
            break

# board printer
def print_board() :
    global squarespace
    for i in range(squarespace):
     for j in range(squarespace):
         print(gameboard[i][j], " ", end = '')
     print()

# repopulates the board
def update_board() :
    global gameboard
    global snake
    global size
    global food
    global squarespace
    for i in range(squarespace):
        for j in range(squarespace):
            gameboard[i][j] = 0
    gameboard[snake[0][0]][snake[0][1]] = 2
    for i in range(1, size):
        gameboard[snake[i][0]][snake[i][1]] = 1
    gameboard[food[0]][food[1]] = 3

# updates the board each frame, moving the head and body and increasing size in case food was eaten
def move():
    global direction
    global snake
    global size
    global squarespace
    if size == squarespace**2: return 1
    # 1 = left, 2 = right, 3 = up, 4 = down
    for i in range(size):
        if(direction[i] == 1):
            snake[i][0] -= 1
            if snake[i][0] == -1: snake[i][0] = squarespace-1
        elif(direction[i] == 2):
            snake[i][0] += 1
            if snake[i][0] == squarespace: snake[i][0] = 0
        elif(direction[i] == 3):
            snake[i][1] -= 1
            if snake[i][1] == -1: snake[i][1] = squarespace-1
        elif(direction[i] == 4):
            snake[i][1] += 1
            if snake[i][1] == squarespace: snake[i][1] = 0

    for i in range(1, size):
        if snake[0][0] == snake[i][0] and snake[0][1] == snake[i][1]: return -1

    for i in range(2, size + 1):    
        if(direction[-i] != direction[1 - i]):
          direction[1 - i] = direction[-i]

    if snake[0][0] == food[0] and snake[0][1] == food[1]:
        direction.append(direction[-1])
        if(direction[-1] == 1):
            if snake[-1][0] + 1 != squarespace: snake.append([snake[-1][0] + 1, snake[-1][1]])
            else: snake.append([0, snake[-1][1]])
        elif(direction[-1] == 2):
            if snake[-1][0] - 1 != 0: snake.append([snake[-1][0] - 1, snake[-1][1]])
            else: snake.append([squarespace-1, snake[-1][1]])
        elif(direction[-1] == 3):
            if snake[-1][1] + 1 != squarespace: snake.append([snake[-1][0], snake[-1][1] + 1])
            else: snake.append([snake[-1][0], 0])
        elif(direction[-1] == 4):
            if snake[-1][1] - 1 != 0: snake.append([snake[-1][0], snake[-1][1] - 1])
            else: snake.append([snake[-1][0], squarespace-1])
        size += 1
        spawn_food()

    update_board()
    return 0



def main() :
    global direction
    global size
    global resol
    global FPS
    init_board()

    pygame.init()
    pygame.display.set_caption("Snake")
    screen = pygame.display.set_mode((resol, resol))
    background = pygame.Surface(screen.get_size())
    background.fill((128, 128, 128))
    background = background.convert()
    clock = pygame.time.Clock()
    fps_font = pygame.font.Font('freesansbold.ttf', 16)
    score_fond = pygame.font.Font('freesansbold.ttf', 20)
    end_font = pygame.font.Font('freesansbold.ttf', 40)

    running = True
    while running:
        clock.tick(FPS)
        change = True

        for i in range(squarespace):
            for j in range(squarespace):
                if(gameboard[i][j] == 0):
                    pygame.draw.rect(background, (0, 0, 0), (1 + i*int(resol/squarespace), 1 + j*int(resol/squarespace), int(resol/squarespace - 2), int(resol/squarespace - 2)))
                elif(gameboard[i][j] == 1):
                    pygame.draw.rect(background, (255, 255, 255), (1 + i*int(resol/squarespace), 1 + j*int(resol/squarespace), int(resol/squarespace - 2), int(resol/squarespace - 2)))
                elif(gameboard[i][j] == 2):
                    pygame.draw.rect(background, (0, 0, 255), (1 + i*int(resol/squarespace), 1 + j*int(resol/squarespace), int(resol/squarespace - 2), int(resol/squarespace - 2)))
                elif(gameboard[i][j] == 3):
                    pygame.draw.rect(background, (255, 0, 0), (1 + i*int(resol/squarespace), 1 + j*int(resol/squarespace), int(resol/squarespace - 2), int(resol/squarespace - 2)))
        screen.blit(background, (0, 0))
    
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_LEFT and direction[0] != 2 and change:
                    direction[0] = 1
                    change = False
                elif event.key == pygame.K_RIGHT and direction[0] != 1 and change:
                    direction[0] = 2
                    change = False
                elif event.key == pygame.K_UP and direction[0] != 4 and change:
                    direction[0] = 3
                    change = False
                elif event.key == pygame.K_DOWN and direction[0] != 3 and change:
                    direction[0] = 4
                    change = False

        state = move()

        fps_surface = fps_font.render("{0:.0f}".format(clock.get_fps()), True, (0, 255, 0))
        screen.blit(fps_surface, (0, 0))
        score_surface = score_fond.render(str(size), True, (255, 255, 0))
        screen.blit(score_surface, (resol - 40, 2))

        if(state == -1):
            background.fill((0, 0, 0))
            screen.blit(background, (0, 0))
            screen.blit(end_font.render("You lost!", True, (255, 255, 255)), (int(resol/2) - 100, int(resol/2) - 20))
            pygame.display.flip()
            pygame.time.wait(5000)
            running = False
        elif(state == 1):
            background.fill((0, 0, 0))
            screen.blit(background, (0, 0))
            screen.blit(end_font.render("You won!", True, (255, 255, 255)), (int(resol/2) - 90, int(resol/2) - 20))
            pygame.display.flip()
            pygame.time.wait(5000)
            running = False

        pygame.display.flip()
    pygame.quit()


gameboard = []
snake = []
direction = []
food = []
size = 3
resol = 640
squarespace = 20
FPS = 15

main()