#include <iostream>
#include <list>
#include <iterator>
#include <string>
using namespace std;

class Matrix
{
public:
	unsigned int rows;
	unsigned int columns;
	double** matrixArr;

	bool isEqual(Matrix* A)
	{
		if (this->columns != A->columns || this->rows != A->rows)
			return false;

		for (unsigned int i = 0; i < this->rows; i++)
		{
			for (unsigned int j = 0; j < this->columns; j++)
			{
				if (this->matrixArr[i][j] != A->matrixArr[i][j])
					return false;
			}
		}

		return true;
	}

	bool isSquare()
	{
		if (this->rows == this->columns)
			return true;
		else
			return false;
	}
};

list <Matrix*> matrixList;

void printMatrix(Matrix* A)
{
	if (A == NULL)
	{
		cout << "NULL\n";
		return;
	}
	for (unsigned int i = 0; i < A->rows; i++)
	{
		for (unsigned int j = 0; j < A->columns; j++)
		{
			if (A->matrixArr[i][j] == -0)
				cout << 0 << " ";
			else
				cout << A->matrixArr[i][j] << " ";
		}
		cout << "\n";
	}
}

void printMatrixList()
{
	list <Matrix*> ::iterator it;
	for (it = matrixList.begin(); it != matrixList.end(); ++it)
		printMatrix(*it);
}

Matrix* createMatrix(unsigned int rows, unsigned int columns, double** matrixArr)
{
	Matrix* A = new Matrix;
	A->rows = rows;
	A->columns = columns;

	if (matrixArr == NULL)
	{
		double** arr = new double*[rows];
		for (unsigned int i = 0; i < rows; i++)
		{
			arr[i] = new double[columns];
			for (unsigned int j = 0; j < columns; j++)
			{
				arr[i][j] = 0;
			}
		}
		A->matrixArr = arr;
	}
	else
	{
		A->matrixArr = matrixArr;
	}
	return A;
}

Matrix* createMatrixUser() 
{
	unsigned int rows = 0;
	unsigned int columns = 0;
	cout << "Enter number of rows ";
	cin >> rows;
	cout << "Enter number of columns ";
	cin >> columns;

	Matrix* A = new Matrix;
	A->rows = rows;
	A->columns = columns;
	double** matrix = new double*[rows];
	cout << "Enter values of rows one by one, e.g. '1 2 3 4 Enter 5 6 7 8'\n";
	string blah;
	getline(cin, blah);
	for(unsigned int i = 0; i < rows; i++)
	{
		string row;
		getline(cin, row);
		matrix[i] = new double[columns];
		for (unsigned int j = 0; j < columns; j++)
		{
			try {
				string entry = row.substr(0, row.find(" "));
				matrix[i][j] = stod(entry);
				row.erase(0, row.find(" ") + 1);
			}
			catch (const invalid_argument& e)
			{
				cout << e.what() << "\n";
				exit(-1);
			}
		}
	}
	A->matrixArr = matrix;
	matrixList.push_back(A);
	return A;
}

Matrix* identity_matrix(unsigned int size)
{
	Matrix* I = new Matrix;
	I->columns = size;
	I->rows = size;
	double** arr = new double*[size];
	for (unsigned int i = 0; i < size; i++)
	{
		arr[i] = new double[size];
		for (unsigned int j = 0; j < size; j++)
		{
			if (j == i)
				arr[i][j] = 1;
			else
				arr[i][j] = 0;
		}
	}
	I->matrixArr = arr;
	return I;
}

Matrix* copyMatrix(Matrix* A)
{
	Matrix* B = new Matrix();
	B->rows = A->rows;
	B->columns = A->columns;
	double** arr = new double*[A->rows];
	for (unsigned int i = 0; i < A->rows; i++)
	{
		arr[i] = new double[A->columns];
		for (unsigned int j = 0; j < A->columns; j++)
		{
			arr[i][j] = A->matrixArr[i][j];
		}
	}
	B->matrixArr = arr;
	return B;
}

bool canAdd(Matrix* A, Matrix* B)
{
	if (A->columns == B->columns && A->rows == B->rows)
		return true;
	else
		return false;
}

bool canMultiply(Matrix* A, Matrix* B)
{
	if (A->columns == B->rows)
		return true;
	else
		return false;
}

Matrix* addMatrices(Matrix* A, Matrix* B)
{
	if (!canAdd(A, B))
		return NULL;

	Matrix* AB = copyMatrix(A);
	for (unsigned int i = 0; i < A->rows; i++)
	{
		for (unsigned int j = 0; j < A->columns; j++)
		{
			AB->matrixArr[i][j] += B->matrixArr[i][j];
		}
	}
	return AB;
}

Matrix* multiplyMatrices(Matrix* A, Matrix* B)
{
	if (!canMultiply(A, B))
		return NULL;

	Matrix* AB = createMatrix(A->rows, B->columns, NULL);
	for (unsigned int i = 0; i < A->rows; i++)
	{
		for (unsigned int j = 0; j < B->columns; j++)
		{
			for (unsigned int k = 0; k < A->columns; k++)
			{
				AB->matrixArr[i][j] += A->matrixArr[i][k] * B->matrixArr[k][j];
			}
		}
	}
	return AB;
}

Matrix* multiplyByScalar(Matrix*A, double scalar)
{
	double** arr = new double*[A->rows];
	for (unsigned int i = 0; i < A->rows; i++)
	{
		arr[i] = new double[A->columns];
		for (unsigned int j = 0; j < A->columns; j++)
		{
			arr[i][j] = A->matrixArr[i][j] * scalar;
		}
	}
	return createMatrix(A->rows, A->columns, arr);
}

Matrix* transpose(Matrix* A)
{
	double** t = new double*[A->columns];
	for (unsigned int i = 0; i < A->columns; i++)
	{
		t[i] = new double[A->rows];
		for (unsigned int j = 0; j < A->rows; j++)
		{
			t[i][j] = A->matrixArr[j][i];
		}
	}

	Matrix* At = createMatrix(A->columns, A->rows, t);
	return At;
}

void ERO_swap(Matrix* A, unsigned int r1, unsigned int r2)
{
	double* temp = A->matrixArr[r1];
	A->matrixArr[r1] = A->matrixArr[r2];
	A->matrixArr[r2] = temp;
}

void ERO_multiply(Matrix* A, unsigned int row, double scalar)
{
	for (unsigned int i = 0; i < A->columns; i++)
	{
		A->matrixArr[row][i] = A->matrixArr[row][i] * scalar;
	}
}

void ERO_add(Matrix* A, unsigned int r1, unsigned int r2, double scalar)
{
	for (unsigned int i = 0; i < A->columns; i++)
	{
		A->matrixArr[r1][i] += scalar * A->matrixArr[r2][i];
	}
}

bool nonzeroColumn(Matrix* A, unsigned int column) 
{
	for (unsigned int i = 0; i < A->rows; i++)
	{
		if (A->matrixArr[i][column] != 0)
			return true;
	}
	return false;
}

// code taken from Wikipedia
Matrix* makeRREF(Matrix* A)
{	
	Matrix* rref = copyMatrix(A);
	unsigned int lead = 0;
	for (unsigned int r = 0; r < rref->rows; r++)
	{
		if (rref->columns < lead)
			return rref;

		unsigned int i = r;
		while (rref->matrixArr[i][lead] == 0)
		{
			++i;
			if (rref->rows < i)
			{
				i = r;
				++lead;
				if (rref->columns < lead)
					return rref;
			}
		}

		ERO_swap(rref, r, i);
		if (rref->matrixArr[r][lead] != 0)
			ERO_multiply(rref, r, (double) 1 / rref->matrixArr[r][lead]);
		for (i = 0; i < rref->rows; i++)
		{
			if (i != r)
				ERO_add(rref, i, r, -rref->matrixArr[i][lead]);
		}
		lead++;
	}
	return rref;
}

unsigned int rankOfMatrix(Matrix* A) 
{
	Matrix* rref = makeRREF(A);
	unsigned int rank = 0;
	for (unsigned int i = 0; i < rref->rows; i++)
	{
		for (unsigned int j = 0; j < rref->columns; j++)
		{
			if (rref->matrixArr[i][j] == 1)
			{
				rank++;
				break;
			}
		}
	}
	return rank;
}

Matrix* split(Matrix* A, unsigned int row, unsigned int column)
{
	double** arr = new double*[A->rows - 1];
	for (unsigned int i = 0; i < A->rows - 1; i++)
		arr[i] = new double[A->columns - 1];

	unsigned int currRow = 0, currCol = 0;
	for (unsigned int i = 0; i < A->rows; i++)
	{
		for (unsigned int j = 0; j < A->columns; j++)
		{
			if (i != row && j != column)
			{
				arr[currRow][currCol] = A->matrixArr[i][j];
				currCol++;
				if (currCol == A->columns - 1)
				{
					currCol = 0;
					currRow++;
				}
			}
		}
	}
	return createMatrix(A->rows - 1, A->columns - 1, arr);
}

double determinant(Matrix* A);
double cofactor(Matrix* A, unsigned int ri, unsigned int ci)
{
	if ((ri + ci + 2) % 2 == 0)
		return determinant(split(A, ri, ci));
	else
		return -determinant(split(A, ri, ci));
}

double determinant(Matrix* A)
{
	if (!A->isSquare())
		return NULL;

	if (A->rows == 2)
	{
		return A->matrixArr[0][0] * A->matrixArr[1][1] - A->matrixArr[0][1] * A->matrixArr[1][0];
	}

	double det = 0;
	for (unsigned int i = 0; i < A->columns; i++)
		det += cofactor(A, 0, i) * A->matrixArr[0][i];
	return det;
}

Matrix* inverse(Matrix* A)
{
	double det = determinant(A);
	if (det == 0 || A->rows != A->columns)
		return NULL;
	double** c_arr = new double*[A->rows];
	for (unsigned int i = 0; i < A->rows; i++)
	{
		c_arr[i] = new double[A->columns];
		for (unsigned int j = 0; j < A->columns; j++)
		{
			c_arr[i][j] = cofactor(A, i, j);
		}
	}
	return multiplyByScalar(transpose(createMatrix(A->rows, A->columns, c_arr)), 1/det);
}

void REPL()
{
	while (true)
	{
		cout << "What do you want to do?\n1. Add two matrices.\n2. Multiply two matrices.\n3. Multiply a matrix by a scalar.\n4. Find the determinant of a matrix.\n5. Find the inverse of the matrix.\n6. Find Reduced Row-Echelon Form of a matrix.\n7. Find the rank of a matrix.\n";
		int in = 0;
		cin >> in;

		if (in == 1)
		{
			Matrix* A = addMatrices(createMatrixUser(), createMatrixUser());
			cout << "\n";
			printMatrix(A);
		}
		else if (in == 2)
		{
			Matrix* A = multiplyMatrices(createMatrixUser(), createMatrixUser());
			printMatrix(A);
		}
		else if (in == 3)
		{
			double scalar;
			cout << "Enter a scalar: ";
			cin >> scalar;
			printMatrix(multiplyByScalar(createMatrixUser(), scalar));
		}
		else if (in == 4)
		{
			double det = determinant(createMatrixUser());
			cout << "Determinant: " << det << "\n";
		}
		else if (in == 5)
		{
			Matrix* A = inverse(createMatrixUser());
			cout << "Inverse:\n";
			printMatrix(A);
		}
		else if (in == 6)
		{
			Matrix* A = makeRREF(createMatrixUser());
			cout << "Reduced Row-Echelon Form:\n";
			printMatrix(A);
		}
		else if (in == 7)
		{
			unsigned int rank = rankOfMatrix(createMatrixUser());
			cout << "Rank of entered matrix: " << rank << "\n";
		}
		else
		{
			cout << "That is not an option\n";
		}

		cout << "What to do something else?[0/1] ";
		cin >> in;
		if (in == 0)
			break;
	}
}

int main()
{
	REPL();
}
