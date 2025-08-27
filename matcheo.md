# Algoritmo matcheo

Dados 2 usuarios, $i$ y $j$, con sus respectivos dias, horarios e historial de juego entre si, podemos diseñar una funcion la cual nos permita determinar cuales son las top x opciones a recomendar al usuario que reserva una cancha para jugar en un dia y hora dados. Analiticamente puedo decir:

Dada una lista ordenada, donde los valores en V estan de forma descendente. Llamare a esa lista ordenada 

$V′: V′=(v_{1}​, v_{2}​, v_{3}​, ... ,v_{N}​)$ 

Donde 

$v_{1} ​≥ v_{2} ​≥ v_{3} ​≥...≥ v_{N}​$

Con $N$ pares $(i,j)$.

$$
P_{\text{topx}} = \{(i,j) \in P \mid A(i,j) \geq v_{\text{topx}}\}
$$

Donde:

$P_{topx}$ es el conjunto resultado que contiene los pares $(i,j)$ que generan los x valores más altos. $P$ es el conjunto de todos los posibles pares $(i,j)$. $v_{topx}$ es el x-ésimo valor más grande de la función $A(i,j)$ después de ordenarlos todos.

$$
A(i,j) = \alpha \times S(i,j) + \beta \times J(i,j)
$$

Donde:

- $S(i,j) = 1 - \frac{d(i,j)}{d_{\max}}$ es la similitud de preferencias, con $d(i,j)$ una distancia euclidiana entre las preferencias de usuario $i$ y $j$, y $d_{\max}$ la distancia máxima posible (normaliza $S$ entre 0 y 1).
- $J(i,j) = \frac{g(i,j)}{g(i)}$, donde la funcion $g(i, j)$ nos indica la cantidad de partidos del usuario $i$ con el usuario $j$, y $g(i)$ nos indica la totalidad de los partidos jugados por el usuario $i$  
- $\alpha$ y $\beta$ son pesos que balancean la importancia de la similitud versus la historia de haber jugado juntos, por lo tanto:
 
$$
\alpha + \beta = 1
$$

Con esta fórmula, se puede calcular el puntaje $A$ para cada par de usuarios, y luego obtener un top $x$ de usuarios con puntajes más altos para un usuario dado. Este puntaje se puede graficar como matriz de calor o top ranking para visualizar semejanzas y relaciones.

Este algoritmo esta inspirado en [k-nearest neighbors algorithm](https://en.wikipedia.org/wiki/K-nearest_neighbors_algorithm).
